
CREATE OR REPLACE FUNCTION public.criar_pedido_publico(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido public.pedidos%ROWTYPE;
  v_item   jsonb;
BEGIN
  -- Basic validation (defense in depth; INSERT policy already enforces similar)
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
    NULLIF(payload->>'cliente_id','')::uuid,
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

  RETURN jsonb_build_object('id', v_pedido.id, 'numero_pedido', v_pedido.numero_pedido);
END;
$$;

REVOKE ALL ON FUNCTION public.criar_pedido_publico(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_pedido_publico(jsonb) TO anon, authenticated;
