
CREATE OR REPLACE FUNCTION public.admin_lucratividade_produtos(dias_periodo integer DEFAULT 30)
 RETURNS TABLE(produto_id uuid, nome text, qtd_vendida integer, receita numeric, custo numeric, lucro numeric, margem_pct numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dias int := GREATEST(1, COALESCE(dias_periodo, 30));
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH itens_prod AS (
    SELECT pi.produto_id AS pid,
           SUM(pi.quantidade)::int AS qtd,
           SUM(pi.subtotal)::numeric AS receita_v,
           SUM(pi.quantidade * COALESCE(p.preco_custo,0))::numeric AS custo_v
    FROM public.pedido_itens pi
    JOIN public.pedidos pe ON pe.id = pi.pedido_id
    LEFT JOIN public.produtos p ON p.id = pi.produto_id
    WHERE pe.status <> 'cancelado'
      AND pe.created_at >= now() - (v_dias || ' days')::interval
      AND pi.kind = 'produto'
      AND pi.produto_id IS NOT NULL
    GROUP BY pi.produto_id
  ),
  itens_kit AS (
    SELECT kc.produto_id AS pid,
           SUM(pi.quantidade * kc.quantidade)::int AS qtd,
           SUM(pi.subtotal * (kc.quantidade * COALESCE(pp.preco_custo,0) / NULLIF(kt.custo_total,0)))::numeric AS receita_v,
           SUM(pi.quantidade * kc.quantidade * COALESCE(pp.preco_custo,0))::numeric AS custo_v
    FROM public.pedido_itens pi
    JOIN public.pedidos pe ON pe.id = pi.pedido_id
    JOIN public.kit_componentes kc ON kc.kit_id = pi.produto_id
    JOIN public.produtos pp ON pp.id = kc.produto_id
    JOIN LATERAL (
      SELECT SUM(kc2.quantidade * COALESCE(p2.preco_custo,0)) AS custo_total
      FROM public.kit_componentes kc2
      JOIN public.produtos p2 ON p2.id = kc2.produto_id
      WHERE kc2.kit_id = pi.produto_id
    ) kt ON true
    WHERE pe.status <> 'cancelado'
      AND pe.created_at >= now() - (v_dias || ' days')::interval
      AND pi.kind = 'kit'
    GROUP BY kc.produto_id
  ),
  total AS (
    SELECT x.pid,
           SUM(x.qtd)::int AS qtd,
           SUM(COALESCE(x.receita_v,0))::numeric AS receita_v,
           SUM(COALESCE(x.custo_v,0))::numeric AS custo_v
    FROM (SELECT * FROM itens_prod UNION ALL SELECT * FROM itens_kit) x
    GROUP BY x.pid
  )
  SELECT
    p.id AS produto_id,
    p.nome::text AS nome,
    t.qtd AS qtd_vendida,
    t.receita_v AS receita,
    t.custo_v AS custo,
    (t.receita_v - t.custo_v)::numeric AS lucro,
    CASE WHEN t.receita_v > 0 THEN ((t.receita_v - t.custo_v) / t.receita_v * 100)::numeric ELSE 0 END AS margem_pct
  FROM total t
  JOIN public.produtos p ON p.id = t.pid
  ORDER BY (t.receita_v - t.custo_v) DESC;
END;
$function$;
