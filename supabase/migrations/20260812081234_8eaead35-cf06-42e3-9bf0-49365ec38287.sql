-- Revoking execute using the standard explicit signature to ensure the Postgres engine matches the function.

REVOKE ALL ON FUNCTION public.set_institute_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reorder_syllabus_chapters(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.collect_fee_payment(uuid, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_plan_limits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_dashboard_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_institute_usage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_faculty_salaries(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_update_institute(uuid, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean, text) FROM PUBLIC;

-- Re-granting only to authorized roles
GRANT EXECUTE ON FUNCTION public.set_institute_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reorder_syllabus_chapters(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collect_fee_payment(uuid, numeric, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_plan_limits() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_institute_usage(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_update_institute(uuid, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean, text) TO authenticated, service_role;
