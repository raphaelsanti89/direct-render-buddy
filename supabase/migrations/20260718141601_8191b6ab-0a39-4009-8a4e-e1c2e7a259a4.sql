
-- Métricas de vendas em período arbitrário (para seletor no dashboard admin)
CREATE OR REPLACE FUNCTION public.admin_metricas_vendas_periodo(p_inicio timestamptz, p_fim timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_receita numeric := 0;
  v_custo numeric := 0;
  v_num int := 0;
  v_variaveis numeric := 0;
  v_margem_bruta numeric := 0;
  v_margem_liquida numeric := 0;
  v_lucro numeric := 0;
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;

  SELECT COUNT(*), COALESCE(SUM(total),0)
    INTO v_num, v_receita
  FROM public.pedidos
  WHERE status <> 'cancelado'
    AND created_at >= p_inicio
    AND created_at < p_fim;

  SELECT COALESCE(SUM(pi.quantidade * COALESCE(p.preco_custo,0)),0)
    INTO v_custo
  FROM public.pedido_itens pi
  JOIN public.pedidos pe ON pe.id = pi.pedido_id
  LEFT JOIN public.produtos p ON p.id = pi.produto_id
  WHERE pe.status <> 'cancelado'
    AND pe.created_at >= p_inicio
    AND pe.created_at < p_fim;

  SELECT COALESCE(SUM(percentual),0)/100.0 INTO v_variaveis FROM public.custos_variaveis;

  v_margem_bruta := CASE WHEN v_receita > 0 THEN (v_receita - v_custo) / v_receita ELSE 0 END;
  v_margem_liquida := GREATEST(0, v_margem_bruta - v_variaveis);
  v_lucro := (v_receita - v_custo) - (v_receita * v_variaveis);

  RETURN jsonb_build_object(
    'receita_total', v_receita,
    'custo_total', v_custo,
    'num_pedidos', v_num,
    'ticket_medio', CASE WHEN v_num > 0 THEN v_receita / v_num ELSE 0 END,
    'margem_real', v_margem_bruta,
    'variaveis_pct', v_variaveis,
    'margem_liquida', v_margem_liquida,
    'lucro', v_lucro
  );
END $$;

-- RPC pública: mais vendidos nos últimos 30 dias (sem dados financeiros sensíveis)
CREATE OR REPLACE FUNCTION public.get_produtos_mais_vendidos_publico(p_limit int DEFAULT 8)
RETURNS TABLE(
  id uuid,
  nome text,
  slug text,
  preco_varejo numeric,
  imagens text[],
  categoria_nome text,
  qtd_vendida int
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH vendas_prod AS (
    SELECT pi.produto_id AS pid, SUM(pi.quantidade)::int AS qtd
    FROM public.pedido_itens pi
    JOIN public.pedidos pe ON pe.id = pi.pedido_id
    WHERE pe.status <> 'cancelado'
      AND pe.created_at >= now() - interval '30 days'
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
      AND pe.created_at >= now() - interval '30 days'
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
    p.slug::text,
    p.preco_varejo,
    p.imagens,
    c.nome::text AS categoria_nome,
    t.qtd
  FROM public.produtos p
  JOIN total t ON t.pid = p.id
  LEFT JOIN public.categorias c ON c.id = p.categoria_id
  WHERE p.ativo = true
  ORDER BY t.qtd DESC
  LIMIT GREATEST(1, COALESCE(p_limit, 8));
$$;

GRANT EXECUTE ON FUNCTION public.get_produtos_mais_vendidos_publico(int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_metricas_vendas_periodo(timestamptz, timestamptz) TO authenticated;
