-- Final surgical strike to reach zero warnings.
-- The linter flags SECURITY DEFINER functions in 'public' if they have ANY grants to PUBLIC or anon/authenticated.
-- We must revoke ALL and grant ONLY to the roles that need them (service_role for triggers).

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- PostgreSQL default is to grant EXECUTE to PUBLIC. We must be explicit.
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER SET search_path = public, auth;
ALTER FUNCTION public.rls_auto_enable() SECURITY DEFINER SET search_path = public, pg_catalog;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
