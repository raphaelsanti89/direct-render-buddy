
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.pedido_status AS ENUM (
    'novo','em_atendimento','confirmado','em_separacao','enviado','entregue','cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pedido_canal AS ENUM (
    'whatsapp','instagram','site','direto','revendedor'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pedido_item_kind AS ENUM ('produto','kit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ SEQUENCE para numero_pedido ============
CREATE SEQUENCE IF NOT EXISTS public.pedido_numero_seq START 1;

-- ============ pedidos ============
CREATE TABLE IF NOT EXISTS public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido text UNIQUE NOT NULL,
  cliente_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  nome_cliente text NOT NULL,
  telefone text NOT NULL,
  email text,
  perfil_cliente text NOT NULL DEFAULT 'varejo',
  origem_pedido text NOT NULL DEFAULT 'site',
  canal_contato public.pedido_canal NOT NULL DEFAULT 'whatsapp',
  responsavel_atendimento uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  forma_pagamento text,
  forma_entrega text,
  endereco text,
  observacoes text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  desconto numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  status public.pedido_status NOT NULL DEFAULT 'novo',
  codigo_rastreamento text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pedidos_status_idx ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS pedidos_cliente_idx ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS pedidos_created_idx ON public.pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS pedidos_telefone_idx ON public.pedidos(telefone);

-- ============ pedido_itens ============
CREATE TABLE IF NOT EXISTS public.pedido_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  kind public.pedido_item_kind NOT NULL DEFAULT 'produto',
  produto_id uuid,
  nome_produto text NOT NULL,
  marca_snapshot text,
  categoria_snapshot text,
  imagem_snapshot text,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  preco_unitario numeric(12,2) NOT NULL,
  subtotal numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pedido_itens_pedido_idx ON public.pedido_itens(pedido_id);

-- ============ pedido_status_historico ============
CREATE TABLE IF NOT EXISTS public.pedido_status_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  status public.pedido_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pedido_status_historico_pedido_idx ON public.pedido_status_historico(pedido_id, created_at);

-- ============ pedido_notas ============
CREATE TABLE IF NOT EXISTS public.pedido_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  texto text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pedido_notas_pedido_idx ON public.pedido_notas(pedido_id, created_at DESC);

-- ============ Trigger: gera numero_pedido GS-ANO-SEQUENCIAL ============
CREATE OR REPLACE FUNCTION public.gerar_numero_pedido()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  seq bigint;
BEGIN
  IF NEW.numero_pedido IS NULL OR NEW.numero_pedido = '' THEN
    seq := nextval('public.pedido_numero_seq');
    NEW.numero_pedido := 'GS-' || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gerar_numero_pedido ON public.pedidos;
CREATE TRIGGER trg_gerar_numero_pedido
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.gerar_numero_pedido();

-- ============ Trigger: updated_at ============
DROP TRIGGER IF EXISTS trg_pedidos_updated_at ON public.pedidos;
CREATE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Trigger: registrar histórico de status ============
CREATE OR REPLACE FUNCTION public.registrar_status_pedido()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.pedido_status_historico(pedido_id, status)
    VALUES (NEW.id, NEW.status);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.pedido_status_historico(pedido_id, status)
    VALUES (NEW.id, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_status_pedido ON public.pedidos;
CREATE TRIGGER trg_registrar_status_pedido
  AFTER INSERT OR UPDATE OF status ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.registrar_status_pedido();

-- ============ Trigger: tags automáticas ============
CREATE OR REPLACE FUNCTION public.calcular_tags_pedido()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_anteriores int;
  novas text[] := '{}';
BEGIN
  SELECT count(*) INTO total_anteriores
  FROM public.pedidos
  WHERE telefone = NEW.telefone AND id <> NEW.id;

  IF total_anteriores = 0 THEN
    novas := array_append(novas, 'Primeiro Pedido');
  ELSE
    novas := array_append(novas, 'Cliente Recorrente');
  END IF;

  IF NEW.perfil_cliente LIKE 'b2b%' THEN
    novas := array_append(novas, 'B2B');
  END IF;

  IF NEW.total >= 500 THEN
    novas := array_append(novas, 'Alto Valor');
  END IF;

  NEW.tags := novas;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calcular_tags_pedido ON public.pedidos;
CREATE TRIGGER trg_calcular_tags_pedido
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.calcular_tags_pedido();

-- ============ RLS ============
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_status_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_notas ENABLE ROW LEVEL SECURITY;

-- pedidos
DROP POLICY IF EXISTS "Anyone reads pedidos by numero" ON public.pedidos;
CREATE POLICY "Anyone reads pedidos by numero"
  ON public.pedidos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone creates pedido" ON public.pedidos;
CREATE POLICY "Anyone creates pedido"
  ON public.pedidos FOR INSERT
  WITH CHECK (
    char_length(nome_cliente) BETWEEN 2 AND 200
    AND char_length(telefone) BETWEEN 6 AND 30
    AND total >= 0
  );

DROP POLICY IF EXISTS "Admins manage pedidos" ON public.pedidos;
CREATE POLICY "Admins manage pedidos"
  ON public.pedidos FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- pedido_itens
DROP POLICY IF EXISTS "Anyone reads pedido_itens" ON public.pedido_itens;
CREATE POLICY "Anyone reads pedido_itens"
  ON public.pedido_itens FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone inserts pedido_itens" ON public.pedido_itens;
CREATE POLICY "Anyone inserts pedido_itens"
  ON public.pedido_itens FOR INSERT
  WITH CHECK (
    quantidade > 0 AND preco_unitario >= 0
  );

DROP POLICY IF EXISTS "Admins manage pedido_itens" ON public.pedido_itens;
CREATE POLICY "Admins manage pedido_itens"
  ON public.pedido_itens FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- pedido_status_historico (público pode ler para timeline)
DROP POLICY IF EXISTS "Anyone reads status historico" ON public.pedido_status_historico;
CREATE POLICY "Anyone reads status historico"
  ON public.pedido_status_historico FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage status historico" ON public.pedido_status_historico;
CREATE POLICY "Admins manage status historico"
  ON public.pedido_status_historico FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- pedido_notas (apenas admin)
DROP POLICY IF EXISTS "Admins manage notas" ON public.pedido_notas;
CREATE POLICY "Admins manage notas"
  ON public.pedido_notas FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
