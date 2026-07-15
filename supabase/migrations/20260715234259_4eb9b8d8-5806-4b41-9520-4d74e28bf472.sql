
INSERT INTO public.configuracoes_gerais (chave, valor, descricao)
VALUES
  ('cobertura_minimo_dias', '15', 'Dias de cobertura de segurança usados para sugerir estoque mínimo dos campeões de venda.'),
  ('cobertura_ideal_dias', '30', 'Dias de cobertura usados para sugerir estoque ideal dos campeões de venda.')
ON CONFLICT (chave) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_produtos_mais_vendidos(dias_periodo int DEFAULT 30)
RETURNS TABLE(
  produto_id uuid,
  nome text,
  qtd_vendida integer,
  media_diaria numeric,
  estoque_atual integer,
  estoque_minimo_atual integer,
  estoque_ideal_atual integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dias int := GREATEST(1, COALESCE(dias_periodo, 30));
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    WITH vendas_prod AS (
      SELECT pi.produto_id AS pid, SUM(pi.quantidade)::int AS qtd
      FROM public.pedido_itens pi
      JOIN public.pedidos pe ON pe.id = pi.pedido_id
      WHERE pe.status <> 'cancelado'
        AND pe.created_at >= now() - (v_dias || ' days')::interval
        AND pi.kind = 'produto'
        AND pi.produto_id IS NOT NULL
      GROUP BY pi.produto_id
    ),
    vendas_kit AS (
      SELECT kc.produto_id AS pid, SUM(pi.quantidade * kc.quantidade)::int AS qtd
      FROM public.pedido_itens pi
      JOIN public.pedidos pe ON pe.id = pi.pedido_id
      JOIN public.kit_componentes kc ON kc.kit_id = pi.produto_id
      WHERE pe.status <> 'cancelado'
        AND pe.created_at >= now() - (v_dias || ' days')::interval
        AND pi.kind = 'kit'
      GROUP BY kc.produto_id
    ),
    total AS (
      SELECT pid, SUM(qtd)::int AS qtd
      FROM (SELECT * FROM vendas_prod UNION ALL SELECT * FROM vendas_kit) x
      GROUP BY pid
    )
    SELECT
      p.id,
      p.nome::text,
      COALESCE(t.qtd, 0)::int,
      (COALESCE(t.qtd, 0)::numeric / v_dias)::numeric,
      p.estoque_atual,
      COALESCE(p.estoque_minimo, 0),
      COALESCE(p.estoque_ideal, 0)
    FROM public.produtos p
    JOIN total t ON t.pid = p.id
    WHERE p.ativo = true AND COALESCE(t.qtd, 0) > 0
    ORDER BY t.qtd DESC
    LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_produtos_mais_vendidos(int) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_produtos_mais_vendidos(int) FROM anon, public;
