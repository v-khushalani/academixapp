-- Fixing SECURITY DEFINER functions correctly
ALTER FUNCTION public.tg_set_updated_at() SECURITY INVOKER;
ALTER FUNCTION public.update_updated_at_column() SECURITY INVOKER;

-- The linter also complains about PUBLIC execute on definer functions.
-- We previously revoked from PUBLIC, but Supabase Linter sometimes sees the "authenticated" 
-- grant as a risk for 0029.
-- To get to 0, we can move the most sensitive definer functions to a internal schema.

CREATE SCHEMA IF NOT EXISTS internal;
GRANT USAGE ON SCHEMA internal TO authenticated, service_role;

-- Example: has_role is used everywhere in RLS. It MUST be definer.
-- If we move it, we break RLS. So we keep it in public but strictly control execute.
-- The linter is a guide; for production live, we want to ensure no EXPLOITABLE issues.

-- Let's ensure ALL functions have search_path set (linter checks this too)
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
