-- 1. kit_componentes: remove public read access (was USING(true))
DROP POLICY IF EXISTS "Anyone reads kit components" ON public.kit_componentes;
-- The existing "Admins manage kit components" policy (FOR ALL) already covers SELECT for admins.

-- 2. Safe public view for kit composition (name + quantity only, no cost data)
CREATE OR REPLACE VIEW public.kit_composicao_publica AS
SELECT
  kc.kit_id,
  kc.produto_id,
  kc.quantidade,
  p.nome AS produto_nome,
  p.slug AS produto_slug,
  p.imagens AS produto_imagens
FROM public.kit_componentes kc
JOIN public.produtos p ON p.id = kc.produto_id
WHERE p.ativo = true;

REVOKE ALL ON public.kit_composicao_publica FROM PUBLIC;
GRANT SELECT ON public.kit_composicao_publica TO anon, authenticated;

-- 3. produtos: restrict cost/margin columns from public/authenticated roles.
-- Postgres table-level SELECT covers all columns; to restrict, revoke it and
-- grant SELECT only on the safe columns.
REVOKE SELECT ON public.produtos FROM anon, authenticated;
GRANT SELECT (
  id, nome, slug, descricao, descricao_curta, categoria_id, volume,
  notas_olfativas, intensidade, sensacao_transmitida, modo_de_uso,
  composicao, durabilidade_media, preco_varejo, preco_assinatura,
  preco_b2b_1, preco_b2b_2, preco_b2b_3, disponivel_varejo,
  disponivel_assinatura, disponivel_b2b, estoque, destaque, lancamento,
  mais_vendido, ativo, imagens, created_at, updated_at
) ON public.produtos TO anon, authenticated;
-- Admin writes (INSERT/UPDATE/DELETE) still gated by RLS "Admins manage produtos".

-- 4. kits: same treatment for custo_embalagem and desconto_kit_pct.
REVOKE SELECT ON public.kits FROM anon, authenticated;
GRANT SELECT (
  id, nome, slug, descricao, descricao_curta, imagens, preco_original,
  preco_varejo, preco_assinatura, preco_b2b_1, preco_b2b_2, preco_b2b_3,
  percentual_economia, disponivel_assinatura, disponivel_b2b, destaque,
  ativo, created_at
) ON public.kits TO anon, authenticated;

-- 5. Admin-only RPCs that return full rows (including cost fields) for admin UI.
CREATE OR REPLACE FUNCTION public.admin_list_produtos()
RETURNS SETOF public.produtos
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.produtos ORDER BY nome;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_kits()
RETURNS SETOF public.kits
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.kits ORDER BY created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_produtos() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_kits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_produtos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_kits() TO authenticated;

-- 6. Admin-only RPC to read kit components (raw quantities) for editing.
CREATE OR REPLACE FUNCTION public.admin_get_kit_componentes(p_kit_id uuid)
RETURNS TABLE(produto_id uuid, quantidade integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT kc.produto_id, kc.quantidade
    FROM public.kit_componentes kc
    WHERE kc.kit_id = p_kit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_kit_componentes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_kit_componentes(uuid) TO authenticated;