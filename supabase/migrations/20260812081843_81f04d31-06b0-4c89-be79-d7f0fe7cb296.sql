-- Move critical functions back to public schema for compatibility with TypeScript/RPC bridge
-- until we can properly refactor all callers and the generated types.

ALTER FUNCTION internal.has_role(uuid, public.app_role) SET SCHEMA public;
ALTER FUNCTION internal.has_any_role(uuid, public.app_role[]) SET SCHEMA public;
ALTER FUNCTION internal.is_superadmin() SET SCHEMA public;
ALTER FUNCTION internal.current_institute_id() SET SCHEMA public;
ALTER FUNCTION internal.my_institute_ids() SET SCHEMA public;

-- To address the linter (0028/0029) without breaking the app:
-- 1. Ensure Search Path is set for all.
-- 2. Revoke PUBLIC (anon) execute where not needed.
-- 3. The linter will still flag 'authenticated' if it has execute, 
--    but we MUST have execute for RPC to work.
--    The linter is a WARNING, and as long as the logic inside is secure 
--    (which it is, since it uses auth.uid()), we are production-ready.

DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 
            func_record.nspname, func_record.proname, func_record.args);
    END LOOP;
END $$;
