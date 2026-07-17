
-- 1) Estoque: revogar EXECUTE público das funções internas.
REVOKE ALL ON FUNCTION public.movimentar_estoque_pedido(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ajustar_estoque_item(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.movimentar_estoque_pedido(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ajustar_estoque_item(uuid, text, integer) TO service_role;

-- 2) Email spoofing: exigir email verificado nas políticas por email.
DROP POLICY IF EXISTS "Owners read own pedidos by email" ON public.pedidos;
CREATE POLICY "Owners read own pedidos by email"
  ON public.pedidos
  FOR SELECT
  TO authenticated
  USING (
    email IS NOT NULL
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND coalesce((auth.jwt() ->> 'email_verified')::boolean, false) = true
  );

DROP POLICY IF EXISTS "Owners read own pedido_status_historico by email" ON public.pedido_status_historico;
CREATE POLICY "Owners read own pedido_status_historico by email"
  ON public.pedido_status_historico
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_status_historico.pedido_id
        AND p.email IS NOT NULL
        AND lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND coalesce((auth.jwt() ->> 'email_verified')::boolean, false) = true
    )
  );

-- 3) Documentar/reforçar contrato de get_pedido_publico (já rejeita códigos < 10 chars).
COMMENT ON FUNCTION public.get_pedido_publico(text, text) IS
  'Consulta pública de pedido. Aceita SOMENTE codigo_rastreio aleatório (12 chars). Nunca aceita numero_pedido sequencial. Exige identificador (telefone/email) para não-donos.';
