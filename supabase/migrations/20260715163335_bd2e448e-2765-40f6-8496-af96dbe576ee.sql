DROP VIEW IF EXISTS public.kit_composicao_publica;

CREATE OR REPLACE FUNCTION public.get_kit_composicao_publica(p_kit_id uuid)
RETURNS TABLE(
  produto_id uuid,
  produto_nome text,
  produto_slug text,
  produto_imagens text[],
  quantidade integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    kc.produto_id,
    p.nome::text,
    p.slug::text,
    p.imagens,
    kc.quantidade
  FROM public.kit_componentes kc
  JOIN public.produtos p ON p.id = kc.produto_id
  JOIN public.kits k ON k.id = kc.kit_id
  WHERE kc.kit_id = p_kit_id
    AND p.ativo = true
    AND k.ativo = true;
$$;

REVOKE ALL ON FUNCTION public.get_kit_composicao_publica(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_kit_composicao_publica(uuid) TO anon, authenticated;