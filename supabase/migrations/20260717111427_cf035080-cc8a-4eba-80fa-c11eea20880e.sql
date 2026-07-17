
-- ============================================================
-- 1) estoque_rpc_public: role check + revoke on stock functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.ajustar_estoque_item(_produto_id uuid, _kind text, _delta_qtd integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Só pode ser chamada por admin autenticado ou internamente
  -- (SECURITY DEFINER chains a partir de RPCs admin já validadas).
  -- current_user = 'postgres' quando invocada por trigger/RPC interna com owner postgres.
  IF current_user NOT IN ('postgres','supabase_admin','service_role')
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _produto_id IS NULL OR _delta_qtd = 0 THEN RETURN; END IF;
  IF _kind = 'produto' THEN
    UPDATE public.produtos SET estoque_atual = estoque_atual - _delta_qtd WHERE id = _produto_id;
  ELSIF _kind = 'kit' THEN
    UPDATE public.produtos p
    SET estoque_atual = p.estoque_atual - (kc.quantidade * _delta_qtd)
    FROM public.kit_componentes kc
    WHERE kc.kit_id = _produto_id AND p.id = kc.produto_id;
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.movimentar_estoque_pedido(_pedido_id uuid, _sinal integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
  IF current_user NOT IN ('postgres','supabase_admin','service_role')
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  FOR r IN
    SELECT kind, produto_id, quantidade FROM public.pedido_itens WHERE pedido_id = _pedido_id
  LOOP
    IF r.produto_id IS NULL THEN CONTINUE; END IF;
    IF r.kind = 'produto' THEN
      UPDATE public.produtos
      SET estoque_atual = estoque_atual + (_sinal * r.quantidade)
      WHERE id = r.produto_id;
    ELSIF r.kind = 'kit' THEN
      UPDATE public.produtos p
      SET estoque_atual = p.estoque_atual + (_sinal * kc.quantidade * r.quantidade)
      FROM public.kit_componentes kc
      WHERE kc.kit_id = r.produto_id AND p.id = kc.produto_id;
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.ajustar_estoque_item(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.movimentar_estoque_pedido(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ajustar_estoque_item(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.movimentar_estoque_pedido(uuid, integer) TO service_role;

-- ============================================================
-- 2) pedido_preco_client: re-price server-side in criar_pedido_publico
-- 3) criar_pedido_spoof: cliente_id/email enforced from JWT (mantido)
-- ============================================================
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
  v_perfil text;
  v_kind text;
  v_produto_id uuid;
  v_qtd int;
  v_preco numeric;
  v_subtotal_item numeric;
  v_subtotal_total numeric := 0;
  v_desconto numeric;
  v_total numeric;
  v_nome text;
  v_categoria text;
  v_imagem text;
BEGIN
  IF coalesce(char_length(payload->>'nome_cliente'), 0) < 2
     OR coalesce(char_length(payload->>'nome_cliente'), 0) > 200 THEN
    RAISE EXCEPTION 'Nome do cliente inválido.';
  END IF;
  IF coalesce(char_length(payload->>'telefone'), 0) < 6
     OR coalesce(char_length(payload->>'telefone'), 0) > 30 THEN
    RAISE EXCEPTION 'Telefone inválido.';
  END IF;
  IF jsonb_typeof(payload->'itens') <> 'array'
     OR jsonb_array_length(payload->'itens') = 0 THEN
    RAISE EXCEPTION 'Pedido sem itens.';
  END IF;

  -- Anti-spoof: cliente_id from JWT; email forced to JWT email when authenticated.
  v_cliente_id := v_uid;
  IF v_uid IS NOT NULL THEN
    v_email_final := NULLIF(v_jwt_email, '');
    IF v_payload_email <> '' AND v_payload_email <> v_jwt_email THEN
      RAISE EXCEPTION 'Email do pedido deve coincidir com o email da conta autenticada.';
    END IF;
  ELSE
    v_email_final := NULLIF(v_payload_email, '');
  END IF;

  -- Perfil do cliente: se autenticado, deriva do profiles;
  -- guests sempre 'varejo' (não podem pedir preço b2b/assinante).
  v_perfil := 'varejo';
  IF v_uid IS NOT NULL THEN
    SELECT CASE
      WHEN p.tipo_cliente = 'b2b' AND p.status_aprovacao = 'aprovado'
        THEN 'b2b_' || coalesce(p.nivel_b2b, 1)::text
      WHEN p.tipo_cliente = 'assinante' THEN 'assinante'
      ELSE 'varejo'
    END
    INTO v_perfil
    FROM public.profiles p WHERE p.id = v_uid;
    v_perfil := coalesce(v_perfil, 'varejo');
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
    v_perfil,
    coalesce(payload->>'origem_pedido','site'),
    coalesce(payload->>'canal_contato','whatsapp')::pedido_canal,
    payload->>'forma_pagamento',
    payload->>'forma_entrega',
    NULLIF(payload->>'endereco',''),
    NULLIF(payload->>'observacoes',''),
    0, 0, 0,
    'novo'
  )
  RETURNING * INTO v_pedido;

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'itens')
  LOOP
    v_kind := coalesce(v_item->>'kind','produto');
    v_produto_id := NULLIF(v_item->>'produto_id','')::uuid;
    v_qtd := coalesce((v_item->>'quantidade')::int, 0);
    IF v_qtd <= 0 THEN
      RAISE EXCEPTION 'Quantidade inválida.';
    END IF;

    -- Server-side pricing: look up real price by perfil.
    v_preco := NULL;
    v_nome := NULL;
    v_categoria := NULL;
    v_imagem := NULL;

    IF v_kind = 'produto' AND v_produto_id IS NOT NULL THEN
      SELECT
        CASE v_perfil
          WHEN 'assinante' THEN coalesce(p.preco_assinatura, p.preco_varejo)
          WHEN 'b2b_1' THEN coalesce(p.preco_b2b_1, p.preco_varejo)
          WHEN 'b2b_2' THEN coalesce(p.preco_b2b_2, p.preco_b2b_1, p.preco_varejo)
          WHEN 'b2b_3' THEN coalesce(p.preco_b2b_3, p.preco_b2b_2, p.preco_b2b_1, p.preco_varejo)
          ELSE p.preco_varejo
        END,
        p.nome,
        (SELECT c.nome FROM public.categorias c WHERE c.id = p.categoria_id),
        (p.imagens)[1]
      INTO v_preco, v_nome, v_categoria, v_imagem
      FROM public.produtos p WHERE p.id = v_produto_id AND p.ativo = true;
    ELSIF v_kind = 'kit' AND v_produto_id IS NOT NULL THEN
      SELECT
        CASE v_perfil
          WHEN 'assinante' THEN coalesce(k.preco_assinatura, k.preco_varejo)
          WHEN 'b2b_1' THEN coalesce(k.preco_b2b_1, k.preco_varejo)
          WHEN 'b2b_2' THEN coalesce(k.preco_b2b_2, k.preco_b2b_1, k.preco_varejo)
          WHEN 'b2b_3' THEN coalesce(k.preco_b2b_3, k.preco_b2b_2, k.preco_b2b_1, k.preco_varejo)
          ELSE k.preco_varejo
        END,
        k.nome,
        (k.imagens)[1]
      INTO v_preco, v_nome, v_imagem
      FROM public.kits k WHERE k.id = v_produto_id AND k.ativo = true;
    END IF;

    IF v_preco IS NULL THEN
      RAISE EXCEPTION 'Produto/kit inválido ou indisponível.';
    END IF;

    v_subtotal_item := v_preco * v_qtd;
    v_subtotal_total := v_subtotal_total + v_subtotal_item;

    INSERT INTO public.pedido_itens (
      pedido_id, kind, produto_id, nome_produto,
      marca_snapshot, categoria_snapshot, imagem_snapshot,
      quantidade, preco_unitario, subtotal
    ) VALUES (
      v_pedido.id,
      v_kind::pedido_item_kind,
      v_produto_id,
      coalesce(v_nome, v_item->>'nome_produto'),
      NULLIF(v_item->>'marca_snapshot',''),
      coalesce(v_categoria, NULLIF(v_item->>'categoria_snapshot','')),
      coalesce(v_imagem, NULLIF(v_item->>'imagem_snapshot','')),
      v_qtd,
      v_preco,
      v_subtotal_item
    );
  END LOOP;

  -- Desconto: só aceita 0 para não permitir totais forjados pelo cliente.
  -- (Descontos reais devem ser aplicados por RPCs admin dedicadas.)
  v_desconto := 0;
  v_total := GREATEST(0, v_subtotal_total - v_desconto);

  UPDATE public.pedidos
  SET subtotal = v_subtotal_total,
      desconto = v_desconto,
      total = v_total
  WHERE id = v_pedido.id
  RETURNING * INTO v_pedido;

  RETURN jsonb_build_object(
    'id', v_pedido.id,
    'numero_pedido', v_pedido.numero_pedido,
    'codigo_rastreio', v_pedido.codigo_rastreio
  );
END;
$function$;
