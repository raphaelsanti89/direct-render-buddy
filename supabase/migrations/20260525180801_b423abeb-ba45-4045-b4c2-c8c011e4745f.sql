
-- 1) Lock down pedidos, pedido_itens, pedido_status_historico from public SELECT
DROP POLICY IF EXISTS "Anyone reads pedidos by numero" ON public.pedidos;
DROP POLICY IF EXISTS "Anyone reads pedido_itens" ON public.pedido_itens;
DROP POLICY IF EXISTS "Anyone reads status historico" ON public.pedido_status_historico;

-- Allow authenticated owners to read their own pedidos / items / history (admin already covered)
CREATE POLICY "Owners read own pedidos"
  ON public.pedidos FOR SELECT
  TO authenticated
  USING (cliente_id = auth.uid());

CREATE POLICY "Owners read own pedido_itens"
  ON public.pedido_itens FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_itens.pedido_id AND p.cliente_id = auth.uid()
  ));

CREATE POLICY "Owners read own status historico"
  ON public.pedido_status_historico FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_status_historico.pedido_id AND p.cliente_id = auth.uid()
  ));

-- 2) Public tracking via SECURITY DEFINER RPC (requires knowing the numero_pedido)
CREATE OR REPLACE FUNCTION public.get_pedido_publico(p_numero text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido jsonb;
  v_itens jsonb;
BEGIN
  SELECT to_jsonb(t) INTO v_pedido
  FROM (
    SELECT
      id, numero_pedido, nome_cliente, status,
      forma_entrega, forma_pagamento, codigo_rastreamento,
      subtotal, desconto, total, created_at
    FROM public.pedidos
    WHERE numero_pedido = p_numero
    LIMIT 1
  ) t;

  IF v_pedido IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.created_at), '[]'::jsonb) INTO v_itens
  FROM (
    SELECT id, nome_produto, imagem_snapshot, quantidade, preco_unitario, subtotal, created_at
    FROM public.pedido_itens
    WHERE pedido_id = (v_pedido->>'id')::uuid
  ) i;

  RETURN jsonb_build_object('pedido', v_pedido, 'itens', v_itens);
END;
$$;

REVOKE ALL ON FUNCTION public.get_pedido_publico(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pedido_publico(text) TO anon, authenticated;

-- 3) Hide sensitive price/cost columns from anon (public catalog)
REVOKE SELECT (preco_custo, margem_varejo_pct, preco_b2b_1, preco_b2b_2, preco_b2b_3, preco_assinatura)
  ON public.produtos FROM anon;

REVOKE SELECT (preco_b2b_1, preco_b2b_2, preco_b2b_3, preco_assinatura)
  ON public.kits FROM anon;

-- 4) configuracoes_gerais: opt-in public flag instead of blanket-public
ALTER TABLE public.configuracoes_gerais
  ADD COLUMN IF NOT EXISTS publico boolean NOT NULL DEFAULT false;

-- Existing rows are static branding/contact info — safe to expose
UPDATE public.configuracoes_gerais SET publico = true;

DROP POLICY IF EXISTS "Anyone reads config" ON public.configuracoes_gerais;
CREATE POLICY "Anyone reads public config"
  ON public.configuracoes_gerais FOR SELECT
  USING (publico = true OR has_role(auth.uid(), 'admin'::app_role));

-- 5) SECURITY DEFINER functions: revoke EXECUTE from anon/authenticated
-- (RLS evaluation does not require EXECUTE grants for the policy-using role)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_sensitive_fields() FROM PUBLIC, anon, authenticated;

-- 6) Storage: remove broad listing on catalogo bucket
-- Public URLs (/object/public/catalogo/...) keep working via bucket.public flag.
DROP POLICY IF EXISTS "Public reads catalogo" ON storage.objects;
