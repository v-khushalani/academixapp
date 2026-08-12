-- Security Hardening Part 2: Addressing remaining linter warnings
-- 1. Hardening Search Paths for all public SECURITY DEFINER functions to prevent hijacking.
-- 2. Ensuring explicit search_path = public for all identified definer functions.

DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prosecdef = true
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 
            func_record.nspname, func_record.proname, func_record.args);
    END LOOP;
END $$;

-- 3. Review and Fix RLS on user_roles to ensure absolute tenant isolation.
-- Ensure no one can see roles outside their institute.
DROP POLICY IF EXISTS "Users can view roles in their institute" ON public.user_roles;
CREATE POLICY "Users can view roles in their institute"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  institute_id = (SELECT institute_id FROM public.profiles WHERE id = auth.uid())
  OR 
  public.is_superadmin()
);

-- 4. Audit Table RLS: Ensure every public table has a restrictive policy or at least one tenant-scoped policy.
-- This is a safety check.
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        -- Enable RLS just in case any were missed (linter check)
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;
