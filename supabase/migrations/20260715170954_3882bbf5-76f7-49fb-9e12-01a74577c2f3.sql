
CREATE OR REPLACE FUNCTION public.admin_count_produtos()
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT count(*)::int INTO v_count FROM public.produtos;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_count_kits()
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT count(*)::int INTO v_count FROM public.kits;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_clientes()
RETURNS TABLE(
  id uuid,
  nome text,
  email text,
  whatsapp text,
  tipo_cliente text,
  nivel_b2b smallint,
  status_aprovacao text,
  empresa_nome text,
  cnpj text,
  observacoes_admin text,
  created_at timestamptz,
  is_guest boolean,
  total_pedidos integer,
  total_gasto numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
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
      coalesce((SELECT count(*)::int FROM public.pedidos pe WHERE pe.cliente_id = p.id), 0) AS total_pedidos,
      coalesce((SELECT sum(pe.total) FROM public.pedidos pe WHERE pe.cliente_id = p.id AND pe.status <> 'cancelado'), 0)::numeric AS total_gasto
    FROM public.profiles p
    UNION ALL
    SELECT
      NULL::uuid AS id,
      g.nome_cliente::text,
      g.email::text,
      g.telefone::text,
      'varejo'::text,
      NULL::smallint,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      g.first_seen AS created_at,
      true AS is_guest,
      g.cnt::int,
      g.total_gasto::numeric
    FROM (
      SELECT
        regexp_replace(coalesce(telefone,''), '\D', '', 'g') AS tel_key,
        (array_agg(nome_cliente ORDER BY created_at DESC))[1] AS nome_cliente,
        (array_agg(email ORDER BY created_at DESC) FILTER (WHERE email IS NOT NULL AND email <> ''))[1] AS email,
        (array_agg(telefone ORDER BY created_at DESC))[1] AS telefone,
        min(created_at) AS first_seen,
        count(*) AS cnt,
        coalesce(sum(CASE WHEN status <> 'cancelado' THEN total ELSE 0 END), 0) AS total_gasto
      FROM public.pedidos
      WHERE cliente_id IS NULL
        AND telefone IS NOT NULL
        AND telefone <> ''
      GROUP BY regexp_replace(coalesce(telefone,''), '\D', '', 'g')
    ) g
    ORDER BY created_at DESC;
END;
$$;
