
-- Fornecedores
CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  linha text,
  pedido_minimo numeric(12,2) NOT NULL DEFAULT 0,
  custo_medio numeric(12,2) NOT NULL DEFAULT 0,
  preco_medio numeric(12,2) NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fornecedores" ON public.fornecedores
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_fornecedores_updated BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Vincular produto -> fornecedor
ALTER TABLE public.produtos
  ADD COLUMN fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL;

-- Custos fixos
CREATE TABLE public.custos_fixos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL,
  categoria text,
  valor_mensal numeric(12,2) NOT NULL DEFAULT 0,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custos_fixos TO authenticated;
GRANT ALL ON public.custos_fixos TO service_role;
ALTER TABLE public.custos_fixos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage custos_fixos" ON public.custos_fixos
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_custos_fixos_updated BEFORE UPDATE ON public.custos_fixos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Referência: decisão (singleton)
CREATE TABLE public.referencia_decisao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referencia_decisao TO authenticated;
GRANT ALL ON public.referencia_decisao TO service_role;
ALTER TABLE public.referencia_decisao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ref_decisao" ON public.referencia_decisao
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_ref_decisao_updated BEFORE UPDATE ON public.referencia_decisao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Referência: custos de abertura
CREATE TABLE public.referencia_custos_abertura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  observacao text,
  tag text NOT NULL DEFAULT 'neutro' CHECK (tag IN ('bom','neutro','atencao')),
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referencia_custos_abertura TO authenticated;
GRANT ALL ON public.referencia_custos_abertura TO service_role;
ALTER TABLE public.referencia_custos_abertura ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ref_abertura" ON public.referencia_custos_abertura
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_ref_abertura_updated BEFORE UPDATE ON public.referencia_custos_abertura
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Referência: manutenção mensal
CREATE TABLE public.referencia_custos_manutencao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  observacao text,
  tag text NOT NULL DEFAULT 'neutro' CHECK (tag IN ('bom','neutro','atencao')),
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referencia_custos_manutencao TO authenticated;
GRANT ALL ON public.referencia_custos_manutencao TO service_role;
ALTER TABLE public.referencia_custos_manutencao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ref_manutencao" ON public.referencia_custos_manutencao
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_ref_manutencao_updated BEFORE UPDATE ON public.referencia_custos_manutencao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Referência: linha do tempo de capital
CREATE TABLE public.referencia_capital_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo text NOT NULL,
  descricao text,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referencia_capital_timeline TO authenticated;
GRANT ALL ON public.referencia_capital_timeline TO service_role;
ALTER TABLE public.referencia_capital_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ref_capital" ON public.referencia_capital_timeline
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_ref_capital_updated BEFORE UPDATE ON public.referencia_capital_timeline
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Referência: checklist
CREATE TABLE public.referencia_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','concluido')),
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referencia_checklist TO authenticated;
GRANT ALL ON public.referencia_checklist TO service_role;
ALTER TABLE public.referencia_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ref_checklist" ON public.referencia_checklist
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_ref_checklist_updated BEFORE UPDATE ON public.referencia_checklist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed do checklist
INSERT INTO public.referencia_checklist (item, ordem) VALUES
  ('Cancelar protocolo RSB2600309748 e reabrir SLU', 1),
  ('Configurar e-mail Zoho Mail + MX', 2),
  ('Cadastro como revendedor Via Aroma', 3),
  ('Contato Olyra para cadastro distribuidor', 4),
  ('Registrar marca no INPI', 5),
  ('Comprar impressora Elgin L42DT', 6),
  ('Instalar SuperFrete ou Melhor Envio', 7);

-- Seed do texto de decisão
INSERT INTO public.referencia_decisao (texto) VALUES
  ('Decisão: SLU é a única opção viável — O MEI não comporta os CNAEs que a Gama precisa (atacadista, consultoria/Arthemis, representante comercial, dev de software). Mesmo restrito ao CNAE varejista, o teto de R$ 81k/ano seria ultrapassado antes do mês 7 pelas projeções de faturamento. A SLU cobre todas as atividades, não tem teto e oferece proteção patrimonial.');

-- Configurações padrão
INSERT INTO public.configuracoes_gerais (chave, valor, descricao, publico) VALUES
  ('margem_piso', '50', 'Margem mínima aceitável (%)', false),
  ('margem_meta', '55', 'Margem alvo (%)', false),
  ('meses_reserva', '3', 'Meses de reserva de capital de giro', false),
  ('dias_uteis_mes', '26', 'Dias úteis abertos por mês', false)
ON CONFLICT (chave) DO NOTHING;

-- ============= Funções admin =============

CREATE OR REPLACE FUNCTION public.admin_estoque_resumo()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT jsonb_build_object(
    'valor_total', COALESCE(SUM(estoque_atual * COALESCE(preco_custo,0)),0),
    'comprar_agora', COALESCE(SUM(CASE WHEN estoque_atual <= COALESCE(estoque_minimo,0) THEN 1 ELSE 0 END),0),
    'comprar_em_breve', COALESCE(SUM(CASE WHEN estoque_atual > COALESCE(estoque_minimo,0) AND estoque_atual < COALESCE(estoque_ideal,0) THEN 1 ELSE 0 END),0)
  ) INTO r FROM public.produtos WHERE ativo = true;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_estoque_posicao()
RETURNS TABLE(
  id uuid, nome text, estoque_atual int, estoque_minimo int, estoque_ideal int,
  preco_custo numeric, valor_investido numeric, status text, fornecedor_id uuid, fornecedor_nome text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
    SELECT p.id, p.nome::text, p.estoque_atual, p.estoque_minimo, p.estoque_ideal,
      COALESCE(p.preco_custo,0)::numeric,
      (p.estoque_atual * COALESCE(p.preco_custo,0))::numeric,
      CASE
        WHEN p.estoque_atual <= COALESCE(p.estoque_minimo,0) THEN 'comprar_agora'
        WHEN p.estoque_atual < COALESCE(p.estoque_ideal,0) THEN 'comprar_em_breve'
        ELSE 'ok'
      END,
      p.fornecedor_id,
      f.nome::text
    FROM public.produtos p
    LEFT JOIN public.fornecedores f ON f.id = p.fornecedor_id
    WHERE p.ativo = true
    ORDER BY
      CASE
        WHEN p.estoque_atual <= COALESCE(p.estoque_minimo,0) THEN 0
        WHEN p.estoque_atual < COALESCE(p.estoque_ideal,0) THEN 1
        ELSE 2
      END,
      p.nome;
END $$;

CREATE OR REPLACE FUNCTION public.admin_metricas_vendas_30d()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_receita numeric := 0;
  v_custo numeric := 0;
  v_num int := 0;
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

  RETURN jsonb_build_object(
    'receita_total', v_receita,
    'custo_total', v_custo,
    'num_pedidos', v_num,
    'ticket_medio', CASE WHEN v_num > 0 THEN v_receita / v_num ELSE 0 END,
    'margem_real', CASE WHEN v_receita > 0 THEN (v_receita - v_custo) / v_receita ELSE 0 END
  );
END $$;

CREATE OR REPLACE FUNCTION public.admin_vendas_mes_por_perfil()
RETURNS TABLE(perfil text, num_pedidos int, receita numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
    SELECT COALESCE(perfil_cliente,'varejo')::text,
      COUNT(*)::int,
      COALESCE(SUM(total),0)::numeric
    FROM public.pedidos
    WHERE status <> 'cancelado'
      AND created_at >= date_trunc('month', now())
    GROUP BY COALESCE(perfil_cliente,'varejo')
    ORDER BY 3 DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_reposicao_fornecedor(p_fornecedor_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v numeric;
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT COALESCE(SUM(
    GREATEST(0, COALESCE(estoque_ideal,0) - estoque_atual) * COALESCE(preco_custo,0)
  ),0) INTO v
  FROM public.produtos
  WHERE fornecedor_id = p_fornecedor_id
    AND ativo = true
    AND estoque_atual < COALESCE(estoque_ideal,0);
  RETURN v;
END $$;
