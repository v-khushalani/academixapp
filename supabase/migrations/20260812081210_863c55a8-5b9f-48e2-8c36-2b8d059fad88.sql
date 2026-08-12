-- Re-applying revokes for overloaded functions or functions with specific signatures that might have been missed by the generic revoke.

-- Specific function signatures (matching what read_query returned)
REVOKE EXECUTE ON FUNCTION public.set_institute_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reorder_syllabus_chapters(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.collect_fee_payment(uuid, numeric, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_plan_limits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_overview() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_institute_usage(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) FROM PUBLIC;

-- Handling the overloaded platform_update_institute
REVOKE EXECUTE ON FUNCTION public.platform_update_institute(uuid, text, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.platform_update_institute(uuid, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean, text) FROM PUBLIC;

-- Explicitly ensuring they are granted to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.set_institute_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reorder_syllabus_chapters(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collect_fee_payment(uuid, numeric, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_plan_limits() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_institute_usage(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_update_institute(uuid, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean, text) TO authenticated, service_role;
