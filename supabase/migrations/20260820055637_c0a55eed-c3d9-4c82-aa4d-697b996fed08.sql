-- Secure SECURITY DEFINER functions by revoking public access and ensuring strict caller validation

-- 1. Revoke public/anon access from all security-critical functions
REVOKE EXECUTE ON FUNCTION public.current_institute_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_my_student(uuid) FROM PUBLIC, anon;

-- 2. Ensure they are explicitly granted to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.current_institute_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_my_student(uuid) TO authenticated, service_role;

-- 3. Additional hardening for any other SECURITY DEFINER functions found in audit
-- Note: 'repair_function_grants' or similar onboarding helpers should also be restricted
DO $$
BEGIN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role';
EXCEPTION WHEN OTHERS THEN 
    -- Function might not exist in this specific schema version
    NULL;
END $$;
