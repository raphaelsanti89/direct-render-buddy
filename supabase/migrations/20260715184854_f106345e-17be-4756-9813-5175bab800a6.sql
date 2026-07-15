
CREATE TABLE public.custos_variaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL,
  percentual numeric NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custos_variaveis TO authenticated;
GRANT ALL ON public.custos_variaveis TO service_role;
ALTER TABLE public.custos_variaveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage custos_variaveis" ON public.custos_variaveis
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER custos_variaveis_updated_at BEFORE UPDATE ON public.custos_variaveis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.custos_variaveis (item, percentual, ordem) VALUES
  ('DAS Simples Nacional', 6, 0),
  ('Taxa de cartão/maquininha', 2.5, 1);

INSERT INTO public.configuracoes_gerais (chave, valor)
VALUES ('prazo_reposicao_dias', '15')
ON CONFLICT (chave) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_metricas_vendas_30d()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_receita numeric := 0;
  v_custo numeric := 0;
  v_num int := 0;
  v_variaveis numeric := 0;
  v_margem_bruta numeric := 0;
  v_margem_liquida numeric := 0;
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT COUNT(*), COALESCE(SUM(total),0)
    INTO v_num, v_receita
  FROM public.pedidos
  WHERE status <> 'cancelado' AND created_at >= now() - interval '30 days';

  SELECT COALESCE(SUM(pi.quantidade * COALESCE(p.preco_custo,0)),0)
    INTO v_custo
  FROM public.pedido_itens pi
  JOIN public.pedidos pe ON pe.id = pi.pedido_id
  LEFT JOIN public.produtos p ON p.id = pi.produto_id
  WHERE pe.status <> 'cancelado' AND pe.created_at >= now() - interval '30 days';

  SELECT COALESCE(SUM(percentual),0)/100.0 INTO v_variaveis FROM public.custos_variaveis;

  v_margem_bruta := CASE WHEN v_receita > 0 THEN (v_receita - v_custo) / v_receita ELSE 0 END;
  v_margem_liquida := GREATEST(0, v_margem_bruta - v_variaveis);

  RETURN jsonb_build_object(
    'receita_total', v_receita,
    'custo_total', v_custo,
    'num_pedidos', v_num,
    'ticket_medio', CASE WHEN v_num > 0 THEN v_receita / v_num ELSE 0 END,
    'margem_real', v_margem_bruta,
    'variaveis_pct', v_variaveis,
    'margem_liquida', v_margem_liquida
  );
END $function$;

CREATE OR REPLACE FUNCTION public.admin_produtos_velocidade()
RETURNS TABLE(
  produto_id uuid,
  qtd_30d integer,
  media_diaria numeric,
  sugestao_minimo integer,
  campeao boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prazo integer;
  v_p80 numeric;
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;

  SELECT COALESCE((SELECT valor::int FROM public.configuracoes_gerais WHERE chave='prazo_reposicao_dias'), 15)
    INTO v_prazo;

  CREATE TEMP TABLE _vel ON COMMIT DROP AS
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
    SELECT pid, SUM(qtd)::int AS qtd FROM (
      SELECT * FROM vendas_prod UNION ALL SELECT * FROM vendas_kit
    ) x GROUP BY pid
  )
  SELECT p.id AS produto_id,
         COALESCE(t.qtd, 0) AS qtd_30d,
         (COALESCE(t.qtd, 0)::numeric / 30.0) AS media_diaria
  FROM public.produtos p
  LEFT JOIN total t ON t.pid = p.id
  WHERE p.ativo = true;

  SELECT COALESCE(percentile_cont(0.8) WITHIN GROUP (ORDER BY qtd_30d), 0)
    INTO v_p80
  FROM _vel WHERE qtd_30d > 0;

  RETURN QUERY
    SELECT v.produto_id,
           v.qtd_30d,
           v.media_diaria,
           CEIL(v.media_diaria * v_prazo)::int AS sugestao_minimo,
           (v.qtd_30d > 0 AND v.qtd_30d::numeric >= v_p80) AS campeao
    FROM _vel v;
END $function$;
