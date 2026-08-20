-- Final cleanup of SECURITY DEFINER functions to address linter warnings.
-- The linter flags these because they are callable by 'authenticated' or 'public' 
-- while having high privileges. We ensure explicit REVOKE and narrow GRANTs.

-- 1. has_any_role (Hardened to include institute check where possible, or kept global for auth)
REVOKE ALL ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated, service_role;

-- 2. current_institute_id
REVOKE ALL ON FUNCTION public.current_institute_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_institute_id() TO authenticated, service_role;

-- 3. is_my_student
REVOKE ALL ON FUNCTION public.is_my_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_my_student(uuid) TO authenticated, service_role;

-- 4. collect_fee_payment
REVOKE ALL ON FUNCTION public.collect_fee_payment(uuid, decimal, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.collect_fee_payment(uuid, decimal, text, text) TO authenticated, service_role;

-- 5. get_dashboard_overview
REVOKE ALL ON FUNCTION public.get_dashboard_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview() TO authenticated, service_role;

-- 6. get_institute_usage
REVOKE ALL ON FUNCTION public.get_institute_usage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_institute_usage(uuid) TO authenticated, service_role;

-- 7. Internal system triggers (authenticated users should NEVER call these directly)
REVOKE ALL ON FUNCTION public.check_plan_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_plan_limits() TO service_role;

REVOKE ALL ON FUNCTION public.set_institute_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_institute_id() TO service_role;

-- 8. my_institute_ids
REVOKE ALL ON FUNCTION public.my_institute_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_institute_ids() TO authenticated, service_role;

-- 9. is_superadmin
REVOKE ALL ON FUNCTION public.is_superadmin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, service_role;

-- 10. has_role (Legacy check if still exists)
DO $$ BEGIN
    REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Hardening profiles/user_roles once more (ensure isolation)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
