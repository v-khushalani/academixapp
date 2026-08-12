-- Move functions back to public
ALTER FUNCTION private.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) SET SCHEMA public;
ALTER FUNCTION private.complete_student_onboarding(text, text, text, text, text, text, text, text, text, date, text, text, text, text, text, text, text, text) SET SCHEMA public;
ALTER FUNCTION private.accept_student_invite(text) SET SCHEMA public;
ALTER FUNCTION private.accept_faculty_invite(text) SET SCHEMA public;
ALTER FUNCTION private.handle_new_user() SET SCHEMA public;
ALTER FUNCTION private.rls_auto_enable() SET SCHEMA public;

-- Standardize ACLs to satisfy linter (Revoke PUBLIC, grant specifically)
REVOKE ALL ON FUNCTION public.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_student_onboarding(text, text, text, text, text, text, text, text, text, date, text, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_student_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_faculty_invite(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_student_onboarding(text, text, text, text, text, text, text, text, text, date, text, text, text, text, text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_student_invite(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_faculty_invite(text) TO authenticated, service_role;

-- Ensure search_path is set (Crucial for SECURITY DEFINER)
ALTER FUNCTION public.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) SET search_path = public;
ALTER FUNCTION public.complete_student_onboarding(text, text, text, text, text, text, text, text, text, date, text, text, text, text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.accept_student_invite(text) SET search_path = public;
ALTER FUNCTION public.accept_faculty_invite(text) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;
ALTER FUNCTION public.rls_auto_enable() SET search_path = public, pg_catalog;

-- Drop private schema
DROP SCHEMA IF EXISTS private CASCADE;
