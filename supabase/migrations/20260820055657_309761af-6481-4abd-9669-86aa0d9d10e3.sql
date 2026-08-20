-- Hardening all SECURITY DEFINER functions by revoking public access and ensuring explicit grants

-- 1. set_institute_id (Internal trigger function)
REVOKE ALL ON FUNCTION public.set_institute_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_institute_id() TO service_role;

-- 2. collect_fee_payment (Sensitive transaction)
REVOKE ALL ON FUNCTION public.collect_fee_payment(uuid, decimal, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.collect_fee_payment(uuid, decimal, text, text) TO authenticated, service_role;

-- 3. current_institute_id (Base isolation helper)
REVOKE ALL ON FUNCTION public.current_institute_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_institute_id() TO authenticated, service_role;

-- 4. has_any_role (Auth helper)
REVOKE ALL ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated, service_role;

-- 5. is_my_student (Privacy helper)
REVOKE ALL ON FUNCTION public.is_my_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_my_student(uuid) TO authenticated, service_role;

-- 6. is_superadmin (Privilege check)
DO $$ BEGIN
    REVOKE ALL ON FUNCTION public.is_superadmin() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 7. repair_function_grants (Maintenance helper)
DO $$ BEGIN
    REVOKE ALL ON FUNCTION public.repair_function_grants() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.repair_function_grants() TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
