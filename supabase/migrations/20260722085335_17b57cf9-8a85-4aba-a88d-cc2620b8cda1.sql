
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS status_pagamento text NOT NULL DEFAULT 'em_aberto'
  CHECK (status_pagamento IN ('pago','em_aberto'));

CREATE INDEX IF NOT EXISTS idx_pedidos_status_pagamento ON public.pedidos(status_pagamento);
