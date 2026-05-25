-- Enum para tipo de cliente
DO $$ BEGIN
  CREATE TYPE public.tipo_cliente AS ENUM ('varejo', 'assinante', 'b2b');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum para status de aprovação B2B
DO $$ BEGIN
  CREATE TYPE public.status_aprovacao AS ENUM ('pendente', 'aprovado', 'rejeitado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Adicionar colunas em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tipo_cliente public.tipo_cliente NOT NULL DEFAULT 'varejo',
  ADD COLUMN IF NOT EXISTS nivel_b2b smallint CHECK (nivel_b2b IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS status_aprovacao public.status_aprovacao,
  ADD COLUMN IF NOT EXISTS empresa_nome varchar(255),
  ADD COLUMN IF NOT EXISTS cnpj varchar(20),
  ADD COLUMN IF NOT EXISTS whatsapp varchar(20),
  ADD COLUMN IF NOT EXISTS observacoes_admin text;

-- Trigger: impedir que o próprio usuário altere campos sensíveis
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se for admin, libera tudo
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Usuário comum: campos sensíveis não podem mudar
  IF NEW.tipo_cliente IS DISTINCT FROM OLD.tipo_cliente
     OR NEW.nivel_b2b IS DISTINCT FROM OLD.nivel_b2b
     OR NEW.status_aprovacao IS DISTINCT FROM OLD.status_aprovacao
     OR NEW.observacoes_admin IS DISTINCT FROM OLD.observacoes_admin THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar tipo de cliente, nível B2B, status de aprovação ou observações.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- Índice para acelerar listagem de B2B pendentes no admin
CREATE INDEX IF NOT EXISTS idx_profiles_b2b_pendentes
  ON public.profiles (status_aprovacao)
  WHERE tipo_cliente = 'b2b';