
-- 1) Tabela clientes_crm
CREATE TABLE IF NOT EXISTS public.clientes_crm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL UNIQUE,
  email text,
  endereco text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes_crm TO authenticated;
GRANT ALL ON public.clientes_crm TO service_role;

ALTER TABLE public.clientes_crm ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_crm_admin_all"
  ON public.clientes_crm FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER clientes_crm_set_updated_at
  BEFORE UPDATE ON public.clientes_crm
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Backfill a partir dos pedidos existentes
INSERT INTO public.clientes_crm (nome, telefone, email, created_at)
SELECT
  COALESCE((array_agg(pe.nome_cliente ORDER BY pe.created_at DESC))[1], 'Cliente') AS nome,
  regexp_replace(coalesce(pe.telefone,''),'\D','','g') AS tel,
  (array_agg(pe.email ORDER BY pe.created_at DESC) FILTER (WHERE pe.email IS NOT NULL AND pe.email <> ''))[1] AS email,
  min(pe.created_at) AS created_at
FROM public.pedidos pe
WHERE pe.telefone IS NOT NULL
  AND pe.telefone <> ''
  AND regexp_replace(coalesce(pe.telefone,''),'\D','','g') <> ''
GROUP BY regexp_replace(coalesce(pe.telefone,''),'\D','','g')
ON CONFLICT (telefone) DO NOTHING;

-- 3) Trigger para criar/atualizar clientes_crm quando um pedido é inserido
CREATE OR REPLACE FUNCTION public.upsert_cliente_crm_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tel text;
BEGIN
  v_tel := regexp_replace(coalesce(NEW.telefone,''), '\D', '', 'g');
  IF v_tel = '' THEN RETURN NEW; END IF;

  INSERT INTO public.clientes_crm (nome, telefone, email)
  VALUES (
    COALESCE(NULLIF(NEW.nome_cliente,''), 'Cliente'),
    v_tel,
    NULLIF(NEW.email,'')
  )
  ON CONFLICT (telefone) DO UPDATE
    SET nome = COALESCE(NULLIF(EXCLUDED.nome,''), public.clientes_crm.nome),
        email = COALESCE(NULLIF(EXCLUDED.email,''), public.clientes_crm.email),
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_upsert_cliente_crm_pedido ON public.pedidos;
CREATE TRIGGER trg_upsert_cliente_crm_pedido
  AFTER INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.upsert_cliente_crm_pedido();

-- 4) admin_list_clientes: usa clientes_crm em vez de agregar pedidos para o "guest"
CREATE OR REPLACE FUNCTION public.admin_list_clientes()
RETURNS TABLE(
  id uuid, nome text, email text, whatsapp text, tipo_cliente text,
  nivel_b2b smallint, status_aprovacao text, empresa_nome text, cnpj text,
  observacoes_admin text, created_at timestamptz, is_guest boolean,
  total_pedidos integer, total_gasto numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT * FROM (
      SELECT
        p.id,
        p.nome::text,
        p.email::text,
        p.whatsapp::text,
        p.tipo_cliente::text,
        p.nivel_b2b,
        p.status_aprovacao::text,
        p.empresa_nome::text,
        p.cnpj::text,
        p.observacoes_admin,
        p.created_at,
        false AS is_guest,
        coalesce((SELECT count(*)::int FROM public.pedidos pe WHERE pe.cliente_id = p.id), 0),
        coalesce((SELECT sum(pe.total) FROM public.pedidos pe WHERE pe.cliente_id = p.id AND pe.status <> 'cancelado'), 0)::numeric
      FROM public.profiles p
      UNION ALL
      SELECT
        c.id,
        c.nome::text,
        c.email::text,
        c.telefone::text,
        'varejo'::text,
        NULL::smallint,
        NULL::text,
        NULL::text,
        NULL::text,
        c.observacoes,
        c.created_at,
        true AS is_guest,
        coalesce((
          SELECT count(*)::int FROM public.pedidos pe
          WHERE pe.cliente_id IS NULL
            AND regexp_replace(coalesce(pe.telefone,''),'\D','','g') = c.telefone
        ), 0),
        coalesce((
          SELECT sum(pe.total) FROM public.pedidos pe
          WHERE pe.cliente_id IS NULL
            AND pe.status <> 'cancelado'
            AND regexp_replace(coalesce(pe.telefone,''),'\D','','g') = c.telefone
        ), 0)::numeric
      FROM public.clientes_crm c
    ) u
    ORDER BY u.created_at DESC;
END;
$$;

-- 5) Excluir pedido (somente se cancelado)
CREATE OR REPLACE FUNCTION public.admin_pedido_excluir(p_pedido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT status::text INTO v_status FROM public.pedidos WHERE id = p_pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'pedido nao encontrado'; END IF;
  IF v_status <> 'cancelado' THEN
    RAISE EXCEPTION 'somente pedidos cancelados podem ser excluidos';
  END IF;

  DELETE FROM public.pedido_itens WHERE pedido_id = p_pedido_id;
  DELETE FROM public.pedido_notas WHERE pedido_id = p_pedido_id;
  DELETE FROM public.pedido_status_historico WHERE pedido_id = p_pedido_id;
  DELETE FROM public.pedidos WHERE id = p_pedido_id;
END;
$$;
