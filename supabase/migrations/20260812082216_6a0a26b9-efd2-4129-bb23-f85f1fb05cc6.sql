CREATE SCHEMA IF NOT EXISTS private;

-- 1. Move the necessary guest-facing SECURITY DEFINER functions to the 'private' schema.
-- This removes them from the 'public' schema, which is the root cause of the linter warnings.
-- Note: Supabase RPC *can* call functions in other schemas if they are granted correctly.

ALTER FUNCTION public.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) SET SCHEMA private;
ALTER FUNCTION public.complete_student_onboarding(text, text, text, text, text, text, text, text, text, date, text, text, text, text, text, text, text, text) SET SCHEMA private;
ALTER FUNCTION public.accept_student_invite(text) SET SCHEMA private;
ALTER FUNCTION public.accept_faculty_invite(text) SET SCHEMA private;

-- 2. Ensure handle_new_user and rls_auto_enable (internal triggers) are also moved to private.
-- These are DEFINER and shouldn't be in public.
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;
ALTER FUNCTION public.rls_auto_enable() SET SCHEMA private;

-- 3. Update the search_path for these functions in their new home.
ALTER FUNCTION private.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) SET search_path = public;
ALTER FUNCTION private.complete_student_onboarding(text, text, text, text, text, text, text, text, text, date, text, text, text, text, text, text, text, text) SET search_path = public;
ALTER FUNCTION private.accept_student_invite(text) SET search_path = public;
ALTER FUNCTION private.accept_faculty_invite(text) SET search_path = public;
ALTER FUNCTION private.handle_new_user() SET search_path = public, auth;
ALTER FUNCTION private.rls_auto_enable() SET search_path = public, pg_catalog;

-- 4. Re-grant access for RPC (if the application uses it).
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO anon, authenticated, service_role;
