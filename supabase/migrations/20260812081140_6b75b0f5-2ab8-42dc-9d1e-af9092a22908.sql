-- 1. Correct search_path for all SECURITY DEFINER functions to prevent search path hijacking.
-- 2. Revoke EXECUTE on all SECURITY DEFINER functions from PUBLIC by default.
-- 3. Explicitly grant EXECUTE back only to the roles that actually need them.

-- Fix search_path for rls_auto_enable (previously set to pg_catalog, standard is public for our logic)
ALTER FUNCTION public.rls_auto_enable() SET search_path = public;

-- Revoke all PUBLIC execute rights on these functions
REVOKE EXECUTE ON FUNCTION public.set_institute_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reorder_syllabus_chapters(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.collect_fee_payment(uuid, numeric, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_plan_limits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_overview() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_institute_usage(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.platform_update_institute(uuid, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean, text) FROM PUBLIC;

-- Re-grant to authenticated/service_role as appropriate
GRANT EXECUTE ON FUNCTION public.set_institute_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reorder_syllabus_chapters(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collect_fee_payment(uuid, numeric, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_plan_limits() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_institute_usage(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_update_institute(uuid, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean, text) TO authenticated, service_role;

-- Note: Onboarding/Public functions (submit_admission_application, get_student_invite, etc.) 
-- are intentionally left accessible to PUBLIC to allow guest registration and intake flows.
