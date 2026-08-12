DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    -- Force revoke ALL execute on ALL functions in public schema from PUBLIC and authenticated
    -- Then we will selectively re-grant only to service_role and then specific ones to others.
    
    FOR func_record IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC', 
            func_record.nspname, func_record.proname, func_record.args);
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM authenticated', 
            func_record.nspname, func_record.proname, func_record.args);
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM anon', 
            func_record.nspname, func_record.proname, func_record.args);
            
        -- Always grant to service_role and postgres
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role', 
            func_record.nspname, func_record.proname, func_record.args);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO postgres', 
            func_record.nspname, func_record.proname, func_record.args);
    END LOOP;
END $$;

-- Now selectively grant back ONLY what is needed for the app to function
-- Authenticated users need almost all app functions
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname NOT IN (
            'submit_admission_application', 
            'get_student_invite', 
            'accept_student_invite', 
            'get_student_by_token', 
            'complete_student_onboarding',
            'get_faculty_invite',
            'accept_faculty_invite',
            'handle_new_user',
            'rls_auto_enable'
        )
    LOOP
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated', 
            func_record.nspname, func_record.proname, func_record.args);
    END LOOP;
END $$;

-- Public/Guest facing functions (onboarding)
GRANT EXECUTE ON FUNCTION public.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_student_onboarding(text, text, text, text, text, text, text, text, text, date, text, text, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_faculty_invite(text) TO anon, authenticated;

-- Account linkage requires authenticated
GRANT EXECUTE ON FUNCTION public.accept_student_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_faculty_invite(text) TO authenticated;

-- Internal triggers/hooks (definer functions called by system)
-- These should generally not be executable by PUBLIC or authenticated roles directly
-- REVOKE is already done above.
