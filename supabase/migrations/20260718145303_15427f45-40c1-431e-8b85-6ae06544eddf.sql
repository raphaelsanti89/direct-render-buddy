
-- Contas a pagar
CREATE TABLE public.contas_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  categoria text,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  data_vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  data_pagamento date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_pagar TO authenticated;
GRANT ALL ON public.contas_pagar TO service_role;

ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam contas a pagar"
  ON public.contas_pagar FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_contas_pagar_updated
  BEFORE UPDATE ON public.contas_pagar
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX contas_pagar_status_venc_idx ON public.contas_pagar (status, data_vencimento);

-- Lucratividade por produto vendido
CREATE OR REPLACE FUNCTION public.admin_lucratividade_produtos(dias_periodo integer DEFAULT 30)
RETURNS TABLE(
  produto_id uuid,
  nome text,
  qtd_vendida integer,
  receita numeric,
  custo numeric,
  lucro numeric,
  margem_pct numeric
)
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
           SUM(pi.subtotal)::numeric AS receita,
           SUM(pi.quantidade * COALESCE(p.preco_custo,0))::numeric AS custo
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
           -- rateio da receita do kit por proporção de custo dos componentes
           SUM(pi.subtotal * (kc.quantidade * COALESCE(pp.preco_custo,0) / NULLIF(kt.custo_total,0)))::numeric AS receita,
           SUM(pi.quantidade * kc.quantidade * COALESCE(pp.preco_custo,0))::numeric AS custo
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
    SELECT pid,
           SUM(qtd)::int AS qtd,
           SUM(COALESCE(receita,0))::numeric AS receita,
           SUM(COALESCE(custo,0))::numeric AS custo
    FROM (SELECT * FROM itens_prod UNION ALL SELECT * FROM itens_kit) x
    GROUP BY pid
  )
  SELECT
    p.id,
    p.nome::text,
    t.qtd,
    t.receita,
    t.custo,
    (t.receita - t.custo)::numeric AS lucro,
    CASE WHEN t.receita > 0 THEN ((t.receita - t.custo) / t.receita * 100)::numeric ELSE 0 END AS margem_pct
  FROM total t
  JOIN public.produtos p ON p.id = t.pid
  ORDER BY (t.receita - t.custo) DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_lucratividade_produtos(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lucratividade_produtos(integer) TO authenticated;
