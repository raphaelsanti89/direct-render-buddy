-- Conceder permissões aos papéis do PostgREST. A RLS continua aplicada por cima.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.categorias, public.produtos, public.kits, public.configuracoes_gerais TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categorias, public.produtos, public.kits, public.configuracoes_gerais TO authenticated;

GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.leads TO authenticated;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT, DELETE ON public.profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Permissão para executar a função de checagem de papel
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;