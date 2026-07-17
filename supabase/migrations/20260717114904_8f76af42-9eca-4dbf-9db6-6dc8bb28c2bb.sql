ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS peso_kg numeric(10,3),
  ADD COLUMN IF NOT EXISTS altura_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS largura_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS comprimento_cm numeric(10,2);