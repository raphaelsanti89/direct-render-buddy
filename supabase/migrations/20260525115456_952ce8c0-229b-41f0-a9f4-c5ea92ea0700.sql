ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS preco_custo numeric,
  ADD COLUMN IF NOT EXISTS margem_varejo_pct numeric;