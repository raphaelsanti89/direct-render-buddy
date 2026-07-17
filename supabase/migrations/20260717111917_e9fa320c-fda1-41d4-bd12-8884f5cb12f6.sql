
CREATE OR REPLACE FUNCTION public.get_pedidos_por_telefone(p_telefone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_digits text;
  v_result jsonb;
BEGIN
  IF p_telefone IS NULL THEN RETURN '[]'::jsonb; END IF;
  v_digits := regexp_replace(p_telefone, '\D', '', 'g');
  -- exige telefone completo, para impedir enumeração
  IF length(v_digits) < 8 THEN RETURN '[]'::jsonb; END IF;

  SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      p.numero_pedido,
      p.codigo_rastreio,
      p.status::text AS status,
      p.total,
      p.created_at
    FROM public.pedidos p
    WHERE regexp_replace(coalesce(p.telefone,''), '\D', '', 'g') = v_digits
    ORDER BY p.created_at DESC
    LIMIT 50
  ) x;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_pedidos_por_telefone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pedidos_por_telefone(text) TO anon, authenticated;
