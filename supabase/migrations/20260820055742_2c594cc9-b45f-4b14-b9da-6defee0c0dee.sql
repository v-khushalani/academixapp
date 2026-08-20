-- Broad audit cleanup: securing all SECURITY DEFINER functions and sensitive RPCs

-- 1. Dashboard and Usage Helpers
REVOKE ALL ON FUNCTION public.get_dashboard_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_institute_usage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_institute_usage(uuid) TO authenticated, service_role;

-- 2. Internal Trigger Functions (should ONLY be run by system/service_role)
REVOKE ALL ON FUNCTION public.check_plan_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_plan_limits() TO service_role;

REVOKE ALL ON FUNCTION public.set_institute_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_institute_id() TO service_role;

-- 3. Superadmin Checks
DO $$ BEGIN
    REVOKE ALL ON FUNCTION public.is_superadmin() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. Audit Log Helpers (ensure they are only accessible to current institute members)
DO $$ BEGIN
    REVOKE ALL ON FUNCTION public.my_institute_ids() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.my_institute_ids() TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 5. Final verification check for the most critical isolation helpers
REVOKE ALL ON FUNCTION public.current_institute_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_institute_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated, service_role;

-- Hardening profiles/user_roles once more (ensure isolation)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
