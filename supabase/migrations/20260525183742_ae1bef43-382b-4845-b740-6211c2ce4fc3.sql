-- Restore EXECUTE on has_role so RLS policies that call it work for public reads.
-- has_role is SECURITY DEFINER and only reads from user_roles — safe to expose.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;