
-- 1) Novos campos em kits: custo de embalagem e desconto padrão do kit
ALTER TABLE public.kits
  ADD COLUMN IF NOT EXISTS custo_embalagem numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_kit_pct numeric NOT NULL DEFAULT 10;

-- 2) Tabela de composição do kit
CREATE TABLE IF NOT EXISTS public.kit_componentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kit_id, produto_id)
);

GRANT SELECT ON public.kit_componentes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_componentes TO authenticated;
GRANT ALL ON public.kit_componentes TO service_role;

ALTER TABLE public.kit_componentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads kit components"
  ON public.kit_componentes FOR SELECT
  USING (true);

CREATE POLICY "Admins manage kit components"
  ON public.kit_componentes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_kit_componentes_updated
  BEFORE UPDATE ON public.kit_componentes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Trigger para baixar estoque quando pedido_itens é inserido
CREATE OR REPLACE FUNCTION public.baixar_estoque_pedido_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.kind = 'produto' AND NEW.produto_id IS NOT NULL THEN
    UPDATE public.produtos
    SET estoque = GREATEST(0, coalesce(estoque, 0) - NEW.quantidade)
    WHERE id = NEW.produto_id;
  ELSIF NEW.kind = 'kit' AND NEW.produto_id IS NOT NULL THEN
    UPDATE public.produtos p
    SET estoque = GREATEST(0, coalesce(p.estoque, 0) - (kc.quantidade * NEW.quantidade))
    FROM public.kit_componentes kc
    WHERE kc.kit_id = NEW.produto_id
      AND p.id = kc.produto_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_baixar_estoque_pedido_item ON public.pedido_itens;
CREATE TRIGGER trg_baixar_estoque_pedido_item
  AFTER INSERT ON public.pedido_itens
  FOR EACH ROW EXECUTE FUNCTION public.baixar_estoque_pedido_item();
