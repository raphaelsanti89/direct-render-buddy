-- 1) Estoque columns
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS estoque_atual integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estoque_minimo integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estoque_ideal integer NOT NULL DEFAULT 0;

-- Backfill from legacy `estoque`
UPDATE public.produtos
SET estoque_atual = COALESCE(estoque, 0)
WHERE estoque_atual = 0 AND estoque IS NOT NULL AND estoque > 0;

-- 2) Flag on pedidos to know if stock has been debited
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS estoque_movimentado boolean NOT NULL DEFAULT false;

-- 3) Movement helper (sinal = -1 baixa, +1 devolução)
CREATE OR REPLACE FUNCTION public.movimentar_estoque_pedido(_pedido_id uuid, _sinal int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT kind, produto_id, quantidade FROM public.pedido_itens WHERE pedido_id = _pedido_id
  LOOP
    IF r.produto_id IS NULL THEN CONTINUE; END IF;
    IF r.kind = 'produto' THEN
      UPDATE public.produtos
      SET estoque_atual = GREATEST(0, estoque_atual + (_sinal * r.quantidade))
      WHERE id = r.produto_id;
    ELSIF r.kind = 'kit' THEN
      UPDATE public.produtos p
      SET estoque_atual = GREATEST(0, p.estoque_atual + (_sinal * kc.quantidade * r.quantidade))
      FROM public.kit_componentes kc
      WHERE kc.kit_id = r.produto_id AND p.id = kc.produto_id;
    END IF;
  END LOOP;
END;
$$;

-- 4) Trigger on pedidos.status transitions
CREATE OR REPLACE FUNCTION public.trg_pedidos_estoque()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmado' AND OLD.status IS DISTINCT FROM NEW.status AND NOT COALESCE(OLD.estoque_movimentado, false) THEN
    PERFORM public.movimentar_estoque_pedido(NEW.id, -1);
    NEW.estoque_movimentado := true;
  ELSIF NEW.status = 'cancelado' AND OLD.status IS DISTINCT FROM NEW.status AND COALESCE(OLD.estoque_movimentado, false) THEN
    PERFORM public.movimentar_estoque_pedido(NEW.id, 1);
    NEW.estoque_movimentado := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pedidos_estoque_status ON public.pedidos;
CREATE TRIGGER trg_pedidos_estoque_status
BEFORE UPDATE OF status ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.trg_pedidos_estoque();

-- 5) Dashboard helper: count of low-stock products
CREATE OR REPLACE FUNCTION public.admin_count_estoque_baixo()
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT count(*)::int INTO v_count
  FROM public.produtos
  WHERE estoque_atual <= COALESCE(estoque_minimo, 0);
  RETURN v_count;
END;
$$;