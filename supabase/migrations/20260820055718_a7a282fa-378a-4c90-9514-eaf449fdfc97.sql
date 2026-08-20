-- Final Hardening: Secure all SECURITY DEFINER functions and fix Password Protection

-- 1. Secure current_institute_id
REVOKE ALL ON FUNCTION public.current_institute_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_institute_id() TO authenticated, service_role;

-- 2. Secure has_any_role
REVOKE ALL ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated, service_role;

-- 3. Secure get_my_roles (if it exists)
DO $$ BEGIN
    REVOKE ALL ON FUNCTION public.get_my_roles() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. Secure default_institute_id (if it exists)
DO $$ BEGIN
    REVOKE ALL ON FUNCTION public.default_institute_id() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.default_institute_id() TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 5. Secure check_user_access (if it exists)
DO $$ BEGIN
    REVOKE ALL ON FUNCTION public.check_user_access(uuid, uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.check_user_access(uuid, uuid) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 6. Note: Password complexity and leaked password protection are Auth settings.
-- We can't enable them via standard SQL migrations in Supabase as they are managed via the dashboard/API settings.
-- However, we can enforce a "security check" comment for the user.
COMMENT ON SCHEMA public IS 'Hardened multi-tenant ERP schema. Ensure Leaked Password Protection is enabled in Supabase Auth Settings.';
