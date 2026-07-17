
-- Fix: criar_pedido_publico must not accept arbitrary email/cliente_id
-- for authenticated callers (spoofing into another user's "Meus Pedidos").
-- Also re-affirm get_pedido_publico requires identifier for non-owners.

CREATE OR REPLACE FUNCTION public.criar_pedido_publico(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pedido public.pedidos%ROWTYPE;
  v_item   jsonb;
  v_uid uuid := auth.uid();
  v_jwt_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_payload_email text := lower(coalesce(NULLIF(payload->>'email',''), ''));
  v_email_final text;
  v_cliente_id uuid;
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

  -- Anti-spoof:
  --  * cliente_id sempre vem de auth.uid() (nunca do payload).
  --  * Se autenticado, email é sempre forçado ao email do JWT
  --    (impede anexar pedidos à conta/email de outra pessoa via
  --     política "Owners read own pedidos by email").
  --  * Se guest (sem sessão), aceita o email do payload como informado.
  v_cliente_id := v_uid;
  IF v_uid IS NOT NULL THEN
    v_email_final := NULLIF(v_jwt_email, '');
    -- Rejeita explicitamente tentativa de gravar email diferente.
    IF v_payload_email <> '' AND v_payload_email <> v_jwt_email THEN
      RAISE EXCEPTION 'Email do pedido deve coincidir com o email da conta autenticada.';
    END IF;
  ELSE
    v_email_final := NULLIF(v_payload_email, '');
  END IF;

  INSERT INTO public.pedidos (
    numero_pedido, cliente_id, nome_cliente, telefone, email,
    perfil_cliente, origem_pedido, canal_contato,
    forma_pagamento, forma_entrega, endereco, observacoes,
    subtotal, desconto, total, status
  ) VALUES (
    '',
    v_cliente_id,
    payload->>'nome_cliente',
    payload->>'telefone',
    v_email_final,
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
$function$;

-- get_pedido_publico: reafirma que exige identificador (telefone/email)
-- para qualquer chamador que NÃO seja o dono autenticado do pedido.
-- Também: só busca por codigo_rastreio (aleatório de 12 chars) —
-- numero_pedido sequencial (GS-YYYY-#####) nunca é aceito como chave.
CREATE OR REPLACE FUNCTION public.get_pedido_publico(p_codigo text, p_identificador text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.pedidos%ROWTYPE;
  v_pedido jsonb;
  v_itens jsonb;
  v_ident text;
  v_ident_digits text;
  v_pedido_tel text;
  v_uid uuid := auth.uid();
  v_jwt_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_authorized boolean := false;
BEGIN
  -- Exige código com formato de rastreio (nunca aceita numero_pedido sequencial).
  IF p_codigo IS NULL OR length(p_codigo) < 10 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_row FROM public.pedidos WHERE codigo_rastreio = p_codigo LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Dono autenticado por cliente_id: dispensa identificador secundário.
  IF v_uid IS NOT NULL AND v_row.cliente_id = v_uid THEN
    v_authorized := true;
  ELSIF p_identificador IS NOT NULL AND length(p_identificador) >= 4 THEN
    v_ident := lower(trim(p_identificador));
    v_ident_digits := regexp_replace(v_ident, '\D', '', 'g');
    v_pedido_tel := regexp_replace(coalesce(v_row.telefone, ''), '\D', '', 'g');

    IF v_row.email IS NOT NULL AND lower(v_row.email) = v_ident THEN
      v_authorized := true;
    ELSIF length(v_pedido_tel) > 0 AND v_ident_digits <> '' AND v_pedido_tel = v_ident_digits THEN
      v_authorized := true;
    ELSIF length(v_pedido_tel) >= 4 AND v_ident_digits = right(v_pedido_tel, 4) THEN
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
$function$;
