
-- Permite ao cliente autenticado ler pedidos onde o email do pedido coincide com o email do JWT
CREATE POLICY "Owners read own pedidos by email"
  ON public.pedidos
  FOR SELECT
  TO authenticated
  USING (
    email IS NOT NULL
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

CREATE POLICY "Owners read own pedido_itens by email"
  ON public.pedido_itens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_itens.pedido_id
        AND p.email IS NOT NULL
        AND lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

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
    )
  );
