REVOKE ALL ON FUNCTION public.apply_plan_catalog_to_institute() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_plan_catalog_to_institute() TO service_role;

REVOKE ALL ON FUNCTION public.sync_institutes_from_plan_catalog() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_institutes_from_plan_catalog() TO service_role;

REVOKE ALL ON FUNCTION public.lock_institute_billing_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lock_institute_billing_columns() TO service_role;