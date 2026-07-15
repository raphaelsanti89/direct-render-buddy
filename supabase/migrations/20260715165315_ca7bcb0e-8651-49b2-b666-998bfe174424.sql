
-- 1) Non-sequential public tracking code
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS codigo_rastreio text UNIQUE;

CREATE OR REPLACE FUNCTION public.gerar_codigo_rastreio_pedido()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  codigo text;
  i int;
  tries int := 0;
BEGIN
  IF NEW.codigo_rastreio IS NOT NULL AND NEW.codigo_rastreio <> '' THEN
    RETURN NEW;
  END IF;
  LOOP
    codigo := '';
    FOR i IN 1..12 LOOP
      codigo := codigo || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.pedidos WHERE codigo_rastreio = codigo);
    tries := tries + 1;
    IF tries > 8 THEN
      codigo := codigo || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
      EXIT;
    END IF;
  END LOOP;
  NEW.codigo_rastreio := codigo;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gerar_codigo_rastreio ON public.pedidos;
CREATE TRIGGER trg_gerar_codigo_rastreio
BEFORE INSERT ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.gerar_codigo_rastreio_pedido();

-- Backfill existing rows
DO $$
DECLARE
  r record;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  codigo text;
  i int;
BEGIN
  FOR r IN SELECT id FROM public.pedidos WHERE codigo_rastreio IS NULL OR codigo_rastreio = '' LOOP
    LOOP
      codigo := '';
      FOR i IN 1..12 LOOP
        codigo := codigo || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.pedidos WHERE codigo_rastreio = codigo);
    END LOOP;
    UPDATE public.pedidos SET codigo_rastreio = codigo WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.pedidos ALTER COLUMN codigo_rastreio SET NOT NULL;

-- 2) Secure public tracking: replace get_pedido_publico
DROP FUNCTION IF EXISTS public.get_pedido_publico(text);

CREATE OR REPLACE FUNCTION public.get_pedido_publico(p_codigo text, p_identificador text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.pedidos%ROWTYPE;
  v_pedido jsonb;
  v_itens jsonb;
  v_ident text;
  v_pedido_tel text;
  v_uid uuid := auth.uid();
  v_jwt_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_authorized boolean := false;
BEGIN
  IF p_codigo IS NULL OR length(p_codigo) < 6 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_row FROM public.pedidos WHERE codigo_rastreio = p_codigo LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Authorization: owner via auth OR matching identifier (email / phone)
  IF v_uid IS NOT NULL AND v_row.cliente_id = v_uid THEN
    v_authorized := true;
  ELSIF v_jwt_email <> '' AND v_row.email IS NOT NULL AND lower(v_row.email) = v_jwt_email THEN
    v_authorized := true;
  ELSIF p_identificador IS NOT NULL AND length(p_identificador) >= 4 THEN
    v_ident := lower(trim(p_identificador));
    v_pedido_tel := regexp_replace(coalesce(v_row.telefone, ''), '\D', '', 'g');
    IF v_row.email IS NOT NULL AND lower(v_row.email) = v_ident THEN
      v_authorized := true;
    ELSIF length(v_pedido_tel) > 0
      AND regexp_replace(v_ident, '\D', '', 'g') <> ''
      AND v_pedido_tel = regexp_replace(v_ident, '\D', '', 'g') THEN
      v_authorized := true;
    ELSIF length(v_pedido_tel) >= 4
      AND regexp_replace(v_ident, '\D', '', 'g') = right(v_pedido_tel, 4) THEN
      v_authorized := true;
    END IF;
  END IF;

  IF NOT v_authorized THEN
    RETURN NULL;
  END IF;

  v_pedido := jsonb_build_object(
    'id', v_row.id,
    'numero_pedido', v_row.numero_pedido,
    'codigo_rastreio', v_row.codigo_rastreio,
    'nome_cliente', v_row.nome_cliente,
    'status', v_row.status,
    'forma_entrega', v_row.forma_entrega,
    'forma_pagamento', v_row.forma_pagamento,
    'codigo_rastreamento', v_row.codigo_rastreamento,
    'subtotal', v_row.subtotal,
    'desconto', v_row.desconto,
    'total', v_row.total,
    'created_at', v_row.created_at
  );

  SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.created_at), '[]'::jsonb) INTO v_itens
  FROM (
    SELECT id, nome_produto, imagem_snapshot, quantidade, preco_unitario, subtotal, created_at
    FROM public.pedido_itens
    WHERE pedido_id = v_row.id
  ) i;

  RETURN jsonb_build_object('pedido', v_pedido, 'itens', v_itens);
END;
$$;

-- 3) Harden criar_pedido_publico: never trust payload cliente_id; use auth.uid()
CREATE OR REPLACE FUNCTION public.criar_pedido_publico(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pedido public.pedidos%ROWTYPE;
  v_item   jsonb;
  v_cliente_id uuid := auth.uid();
BEGIN
  IF coalesce(char_length(payload->>'nome_cliente'), 0) < 2
     OR coalesce(char_length(payload->>'nome_cliente'), 0) > 200 THEN
    RAISE EXCEPTION 'Nome do cliente inválido.';
  END IF;
  IF coalesce(char_length(payload->>'telefone'), 0) < 6
     OR coalesce(char_length(payload->>'telefone'), 0) > 30 THEN
    RAISE EXCEPTION 'Telefone inválido.';
  END IF;
  IF coalesce((payload->>'total')::numeric, -1) < 0 THEN
    RAISE EXCEPTION 'Total inválido.';
  END IF;
  IF jsonb_typeof(payload->'itens') <> 'array'
     OR jsonb_array_length(payload->'itens') = 0 THEN
    RAISE EXCEPTION 'Pedido sem itens.';
  END IF;

  INSERT INTO public.pedidos (
    numero_pedido, cliente_id, nome_cliente, telefone, email,
    perfil_cliente, origem_pedido, canal_contato,
    forma_pagamento, forma_entrega, endereco, observacoes,
    subtotal, desconto, total, status
  ) VALUES (
    '',
    v_cliente_id, -- forced from auth.uid(); NULL for guests
    payload->>'nome_cliente',
    payload->>'telefone',
    NULLIF(payload->>'email',''),
    coalesce(payload->>'perfil_cliente','varejo'),
    coalesce(payload->>'origem_pedido','site'),
    coalesce(payload->>'canal_contato','whatsapp')::pedido_canal,
    payload->>'forma_pagamento',
    payload->>'forma_entrega',
    NULLIF(payload->>'endereco',''),
    NULLIF(payload->>'observacoes',''),
    coalesce((payload->>'subtotal')::numeric, 0),
    coalesce((payload->>'desconto')::numeric, 0),
    coalesce((payload->>'total')::numeric, 0),
    'novo'
  )
  RETURNING * INTO v_pedido;

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'itens')
  LOOP
    IF coalesce((v_item->>'quantidade')::int, 0) <= 0
       OR coalesce((v_item->>'preco_unitario')::numeric, -1) < 0 THEN
      RAISE EXCEPTION 'Item inválido.';
    END IF;

    INSERT INTO public.pedido_itens (
      pedido_id, kind, produto_id, nome_produto,
      marca_snapshot, categoria_snapshot, imagem_snapshot,
      quantidade, preco_unitario, subtotal
    ) VALUES (
      v_pedido.id,
      coalesce(v_item->>'kind','produto')::pedido_item_kind,
      NULLIF(v_item->>'produto_id','')::uuid,
      v_item->>'nome_produto',
      NULLIF(v_item->>'marca_snapshot',''),
      NULLIF(v_item->>'categoria_snapshot',''),
      NULLIF(v_item->>'imagem_snapshot',''),
      (v_item->>'quantidade')::int,
      (v_item->>'preco_unitario')::numeric,
      (v_item->>'subtotal')::numeric
    );
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_pedido.id,
    'numero_pedido', v_pedido.numero_pedido,
    'codigo_rastreio', v_pedido.codigo_rastreio
  );
END;
$$;
