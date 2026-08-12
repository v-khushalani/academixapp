-- Final sweep: Convert triggers back to DEFINER as they require elevated permissions,
-- but revoke PUBLIC execution to keep the linter happy (it flags definer + public execute).

-- 1. handle_new_user (Auth trigger)
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER SET search_path = public, auth;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 2. rls_auto_enable (Management helper)
ALTER FUNCTION public.rls_auto_enable() SECURITY DEFINER SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

-- 3. The onboarding/invite functions we just moved to serverFn should stay INVOKER 
-- to satisfy the linter perfectly (zero definers callable by users).
-- This migration ensures triggers work while internal logic stays invoker.
