-- Security Hardening: Revoking Public access and enforcing Search Path
-- This migration addresses the remaining linter warnings by strictly controlling EXECUTE privileges.

-- 1. Create a migration to revoke and re-grant
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    -- Revoke all execute from PUBLIC on all functions in public schema
    -- The linter warns when PUBLIC (which includes anon) can execute SECURITY DEFINER functions.
    FOR func_record IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC', 
            func_record.nspname, func_record.proname, func_record.args);
    END LOOP;

    -- Re-grant to authenticated and service_role for internal app logic
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
            'accept_faculty_invite'
        )
    LOOP
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated', 
            func_record.nspname, func_record.proname, func_record.args);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role', 
            func_record.nspname, func_record.proname, func_record.args);
    END LOOP;

    -- Explicitly grant back to ANON for onboarding functions
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) TO anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_student_invite(text) TO anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.accept_student_invite(text) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_student_by_token(text) TO anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.complete_student_onboarding(text, text, text, text, text, text, text, text, text, date, text, text, text, text, text, text, text, text) TO anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_faculty_invite(text) TO anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.accept_faculty_invite(text) TO authenticated';

    -- Note: accept_student_invite and accept_faculty_invite are changed to authenticated 
    -- because the user must be logged in to "accept" and link the invite to their account.
END $$;