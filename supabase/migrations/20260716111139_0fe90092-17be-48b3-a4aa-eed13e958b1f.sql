
-- 1) Drop stale trigger writing to legacy `estoque` column
DROP TRIGGER IF EXISTS trg_baixar_estoque_pedido_item ON public.pedido_itens;
DROP FUNCTION IF EXISTS public.baixar_estoque_pedido_item();

-- 2) Allow negative stock (remove GREATEST clamp)
CREATE OR REPLACE FUNCTION public.movimentar_estoque_pedido(_pedido_id uuid, _sinal integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT kind, produto_id, quantidade FROM public.pedido_itens WHERE pedido_id = _pedido_id
  LOOP
    IF r.produto_id IS NULL THEN CONTINUE; END IF;
    IF r.kind = 'produto' THEN
      UPDATE public.produtos
      SET estoque_atual = estoque_atual + (_sinal * r.quantidade)
      WHERE id = r.produto_id;
    ELSIF r.kind = 'kit' THEN
      UPDATE public.produtos p
      SET estoque_atual = p.estoque_atual + (_sinal * kc.quantidade * r.quantidade)
      FROM public.kit_componentes kc
      WHERE kc.kit_id = r.produto_id AND p.id = kc.produto_id;
    END IF;
  END LOOP;
END;
$function$;

-- 3) Handle INSERT (manual pedidos criados já em 'confirmado') e UPDATE
CREATE OR REPLACE FUNCTION public.trg_pedidos_estoque()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'confirmado' AND NOT COALESCE(NEW.estoque_movimentado, false) THEN
      -- itens são inseridos após o pedido; agendar via AFTER trigger separado abaixo
      NEW.estoque_movimentado := false; -- será marcado pelo AFTER
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'confirmado' AND OLD.status IS DISTINCT FROM NEW.status AND NOT COALESCE(OLD.estoque_movimentado, false) THEN
    PERFORM public.movimentar_estoque_pedido(NEW.id, -1);
    NEW.estoque_movimentado := true;
  ELSIF NEW.status = 'cancelado' AND OLD.status IS DISTINCT FROM NEW.status AND COALESCE(OLD.estoque_movimentado, false) THEN
    PERFORM public.movimentar_estoque_pedido(NEW.id, 1);
    NEW.estoque_movimentado := false;
  END IF;
  RETURN NEW;
END;
$function$;

-- Nova função: após inserir um item, se o pedido já está confirmado e ainda não movimentou, dar baixa somente daquele item.
-- Solução mais simples: função que roda em AFTER INSERT do último item — usaremos trigger em pedido_itens que dá baixa do item individual quando pedido está confirmado e estoque_movimentado=false.
CREATE OR REPLACE FUNCTION public.baixar_item_se_pedido_confirmado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
  v_mov boolean;
BEGIN
  SELECT status::text, COALESCE(estoque_movimentado,false)
    INTO v_status, v_mov
  FROM public.pedidos WHERE id = NEW.pedido_id;

  IF v_status = 'confirmado' AND NOT v_mov AND NEW.produto_id IS NOT NULL THEN
    IF NEW.kind = 'produto' THEN
      UPDATE public.produtos
      SET estoque_atual = estoque_atual - NEW.quantidade
      WHERE id = NEW.produto_id;
    ELSIF NEW.kind = 'kit' THEN
      UPDATE public.produtos p
      SET estoque_atual = p.estoque_atual - (kc.quantidade * NEW.quantidade)
      FROM public.kit_componentes kc
      WHERE kc.kit_id = NEW.produto_id AND p.id = kc.produto_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_baixar_item_confirmado ON public.pedido_itens;
CREATE TRIGGER trg_baixar_item_confirmado
AFTER INSERT ON public.pedido_itens
FOR EACH ROW EXECUTE FUNCTION public.baixar_item_se_pedido_confirmado();

-- Após inserir todos os itens de um pedido já confirmado, marcar estoque_movimentado=true.
-- Simplificação: fazer isso via função utilitária que o app chama? Melhor: trigger AFTER INSERT em pedidos que agenda?
-- Solução direta: quando o pedido é inserido com status 'confirmado', deixar estoque_movimentado=false. Depois os itens dão baixa individual (acima). Um trigger AFTER INSERT no pedido não ajuda porque itens vêm depois.
-- Estratégia: o item, ao dar baixa, também marca o pedido como movimentado. Fazemos isso no fim do trigger acima.
CREATE OR REPLACE FUNCTION public.baixar_item_se_pedido_confirmado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
  v_mov boolean;
BEGIN
  SELECT status::text, COALESCE(estoque_movimentado,false)
    INTO v_status, v_mov
  FROM public.pedidos WHERE id = NEW.pedido_id;

  IF v_status = 'confirmado' AND NOT v_mov AND NEW.produto_id IS NOT NULL THEN
    IF NEW.kind = 'produto' THEN
      UPDATE public.produtos
      SET estoque_atual = estoque_atual - NEW.quantidade
      WHERE id = NEW.produto_id;
    ELSIF NEW.kind = 'kit' THEN
      UPDATE public.produtos p
      SET estoque_atual = p.estoque_atual - (kc.quantidade * NEW.quantidade)
      FROM public.kit_componentes kc
      WHERE kc.kit_id = NEW.produto_id AND p.id = kc.produto_id;
    END IF;
    -- marca o pedido como movimentado (idempotente por item, mas todos os itens veem v_mov=false até a primeira marcação;
    -- por isso só marcamos depois do último item... simplesmente marcar aqui faria os próximos itens não darem baixa.
    -- Solução: NÃO marcar aqui; deixar estoque_movimentado=false até um cancelamento nunca reverter. Para permitir reversão em 'cancelado',
    -- marcamos no fim via statement-level trigger.
  END IF;
  RETURN NEW;
END;
$function$;

-- Statement-level trigger: após inserir itens, se pedido está confirmado e ainda não marcado, marcar.
CREATE OR REPLACE FUNCTION public.marcar_pedido_movimentado_apos_itens()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.pedidos p
  SET estoque_movimentado = true
  WHERE p.status = 'confirmado'
    AND COALESCE(p.estoque_movimentado,false) = false
    AND EXISTS (SELECT 1 FROM new_rows n WHERE n.pedido_id = p.id);
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_marcar_pedido_mov ON public.pedido_itens;
CREATE TRIGGER trg_marcar_pedido_mov
AFTER INSERT ON public.pedido_itens
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT EXECUTE FUNCTION public.marcar_pedido_movimentado_apos_itens();

-- 4) Resumo de estoque: valor investido ignora quantidades negativas
CREATE OR REPLACE FUNCTION public.admin_estoque_resumo()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r jsonb;
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT jsonb_build_object(
    'valor_total', COALESCE(SUM(GREATEST(estoque_atual,0) * COALESCE(preco_custo,0)),0),
    'comprar_agora', COALESCE(SUM(CASE WHEN estoque_atual <= COALESCE(estoque_minimo,0) THEN 1 ELSE 0 END),0),
    'comprar_em_breve', COALESCE(SUM(CASE WHEN estoque_atual > COALESCE(estoque_minimo,0) AND estoque_atual < COALESCE(estoque_ideal,0) THEN 1 ELSE 0 END),0)
  ) INTO r FROM public.produtos WHERE ativo = true;
  RETURN r;
END $function$;

-- 5) Posição de estoque: valor_investido usa GREATEST(0, estoque_atual); status mantém regra atual
CREATE OR REPLACE FUNCTION public.admin_estoque_posicao()
 RETURNS TABLE(id uuid, nome text, estoque_atual integer, estoque_minimo integer, estoque_ideal integer, preco_custo numeric, valor_investido numeric, status text, fornecedor_id uuid, fornecedor_nome text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
    SELECT p.id, p.nome::text, p.estoque_atual, p.estoque_minimo, p.estoque_ideal,
      COALESCE(p.preco_custo,0)::numeric,
      (GREATEST(p.estoque_atual,0) * COALESCE(p.preco_custo,0))::numeric,
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
END $function$;
