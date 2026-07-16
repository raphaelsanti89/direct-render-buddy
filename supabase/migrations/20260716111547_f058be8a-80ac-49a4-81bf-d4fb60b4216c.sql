
CREATE OR REPLACE FUNCTION public.admin_list_clientes()
 RETURNS TABLE(id uuid, nome text, email text, whatsapp text, tipo_cliente text, nivel_b2b smallint, status_aprovacao text, empresa_nome text, cnpj text, observacoes_admin text, created_at timestamp with time zone, is_guest boolean, total_pedidos integer, total_gasto numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT * FROM (
      SELECT
        p.id,
        p.nome::text AS nome,
        p.email::text AS email,
        p.whatsapp::text AS whatsapp,
        p.tipo_cliente::text AS tipo_cliente,
        p.nivel_b2b,
        p.status_aprovacao::text AS status_aprovacao,
        p.empresa_nome::text AS empresa_nome,
        p.cnpj::text AS cnpj,
        p.observacoes_admin,
        p.created_at AS created_at,
        false AS is_guest,
        coalesce((SELECT count(*)::int FROM public.pedidos pe WHERE pe.cliente_id = p.id), 0) AS total_pedidos,
        coalesce((SELECT sum(pe.total) FROM public.pedidos pe WHERE pe.cliente_id = p.id AND pe.status <> 'cancelado'), 0)::numeric AS total_gasto
      FROM public.profiles p
      UNION ALL
      SELECT
        NULL::uuid AS id,
        g.nome_cliente::text,
        g.email::text,
        g.telefone::text,
        'varejo'::text,
        NULL::smallint,
        NULL::text,
        NULL::text,
        NULL::text,
        NULL::text,
        g.first_seen AS created_at,
        true AS is_guest,
        g.cnt::int,
        g.total_gasto::numeric
      FROM (
        SELECT
          regexp_replace(coalesce(pe.telefone,''), '\D', '', 'g') AS tel_key,
          (array_agg(pe.nome_cliente ORDER BY pe.created_at DESC))[1] AS nome_cliente,
          (array_agg(pe.email ORDER BY pe.created_at DESC) FILTER (WHERE pe.email IS NOT NULL AND pe.email <> ''))[1] AS email,
          (array_agg(pe.telefone ORDER BY pe.created_at DESC))[1] AS telefone,
          min(pe.created_at) AS first_seen,
          count(*) AS cnt,
          coalesce(sum(CASE WHEN pe.status <> 'cancelado' THEN pe.total ELSE 0 END), 0) AS total_gasto
        FROM public.pedidos pe
        WHERE pe.cliente_id IS NULL
          AND pe.telefone IS NOT NULL
          AND pe.telefone <> ''
        GROUP BY regexp_replace(coalesce(pe.telefone,''), '\D', '', 'g')
      ) g
    ) u
    ORDER BY u.created_at DESC;
END;
$function$;

-- Função para dar baixa/estornar estoque de UM item específico (usada ao editar pedido já confirmado)
CREATE OR REPLACE FUNCTION public.ajustar_estoque_item(_produto_id uuid, _kind text, _delta_qtd integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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

-- Editar itens (upsert por linha) e recalcular totais do pedido; ajusta estoque quando já confirmado.
-- payload: { itens: [ { id?, kind, produto_id, nome_produto, imagem_snapshot, quantidade, preco_unitario } ], desconto? }
CREATE OR REPLACE FUNCTION public.admin_pedido_editar_itens(p_pedido_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
  v_movimentado boolean;
  v_item jsonb;
  v_old_id uuid;
  v_ids_novos uuid[] := ARRAY[]::uuid[];
  v_subtotal numeric := 0;
  v_desconto numeric;
  r record;
  v_old_qtd int;
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;

  SELECT status::text, COALESCE(estoque_movimentado,false)
    INTO v_status, v_movimentado
  FROM public.pedidos WHERE id = p_pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'pedido nao encontrado'; END IF;

  IF jsonb_typeof(p_payload->'itens') <> 'array' THEN
    RAISE EXCEPTION 'itens invalidos';
  END IF;

  -- 1) UPSERT: cada item do payload
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'itens')
  LOOP
    v_old_id := NULLIF(v_item->>'id','')::uuid;
    IF v_old_id IS NOT NULL THEN
      SELECT quantidade INTO v_old_qtd FROM public.pedido_itens WHERE id = v_old_id AND pedido_id = p_pedido_id;
      IF NOT FOUND THEN v_old_qtd := 0; END IF;
      UPDATE public.pedido_itens SET
        quantidade = (v_item->>'quantidade')::int,
        preco_unitario = (v_item->>'preco_unitario')::numeric,
        subtotal = ((v_item->>'quantidade')::int * (v_item->>'preco_unitario')::numeric)
      WHERE id = v_old_id;
      v_ids_novos := array_append(v_ids_novos, v_old_id);
      IF v_movimentado THEN
        PERFORM public.ajustar_estoque_item(
          NULLIF(v_item->>'produto_id','')::uuid,
          COALESCE(v_item->>'kind','produto'),
          ((v_item->>'quantidade')::int - v_old_qtd)
        );
      END IF;
    ELSE
      INSERT INTO public.pedido_itens (
        pedido_id, kind, produto_id, nome_produto, imagem_snapshot,
        categoria_snapshot, marca_snapshot,
        quantidade, preco_unitario, subtotal
      ) VALUES (
        p_pedido_id,
        COALESCE(v_item->>'kind','produto')::pedido_item_kind,
        NULLIF(v_item->>'produto_id','')::uuid,
        v_item->>'nome_produto',
        NULLIF(v_item->>'imagem_snapshot',''),
        NULLIF(v_item->>'categoria_snapshot',''),
        NULLIF(v_item->>'marca_snapshot',''),
        (v_item->>'quantidade')::int,
        (v_item->>'preco_unitario')::numeric,
        ((v_item->>'quantidade')::int * (v_item->>'preco_unitario')::numeric)
      ) RETURNING id INTO v_old_id;
      v_ids_novos := array_append(v_ids_novos, v_old_id);
      IF v_movimentado THEN
        PERFORM public.ajustar_estoque_item(
          NULLIF(v_item->>'produto_id','')::uuid,
          COALESCE(v_item->>'kind','produto'),
          (v_item->>'quantidade')::int
        );
      END IF;
    END IF;
  END LOOP;

  -- 2) Remover itens que não estão mais no payload (estorna estoque se confirmado)
  FOR r IN
    SELECT id, produto_id, kind::text AS kind, quantidade
    FROM public.pedido_itens
    WHERE pedido_id = p_pedido_id AND NOT (id = ANY(v_ids_novos))
  LOOP
    IF v_movimentado THEN
      PERFORM public.ajustar_estoque_item(r.produto_id, r.kind, -r.quantidade);
    END IF;
    DELETE FROM public.pedido_itens WHERE id = r.id;
  END LOOP;

  -- 3) Recalcular totais
  SELECT COALESCE(SUM(subtotal),0) INTO v_subtotal
  FROM public.pedido_itens WHERE pedido_id = p_pedido_id;

  v_desconto := COALESCE((p_payload->>'desconto')::numeric,
                         (SELECT desconto FROM public.pedidos WHERE id = p_pedido_id));

  UPDATE public.pedidos
  SET subtotal = v_subtotal,
      desconto = v_desconto,
      total = GREATEST(0, v_subtotal - v_desconto)
  WHERE id = p_pedido_id;

  RETURN jsonb_build_object('subtotal', v_subtotal, 'desconto', v_desconto, 'total', GREATEST(0, v_subtotal - v_desconto));
END $function$;
