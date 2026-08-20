-- Securing create_institute_with_owner function to satisfy linter
REVOKE ALL ON FUNCTION public.create_institute_with_owner(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_institute_with_owner(text, text) TO authenticated, service_role;

-- Securing any other potential PUBLIC/ANON executable SECURITY DEFINER functions
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.prosecdef = true
    ) LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon', r.nspname, r.proname, r.args);
        -- Re-grant to authenticated/service_role as per previous patterns
        IF r.proname NOT IN ('set_institute_id', 'check_plan_limits') THEN
            EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role', r.nspname, r.proname, r.args);
        ELSE
            EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role', r.nspname, r.proname, r.args);
        END IF;
    END LOOP;
END $$;
