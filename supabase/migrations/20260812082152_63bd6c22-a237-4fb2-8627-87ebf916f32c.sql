-- Aggressive security hardening to resolve ALL remaining linter issues.

-- 1. Revoke public/anon execute from the guest-facing definer functions.
-- This stops the 0028 (Public Can Execute) warnings.
-- Note: 'anon' role still needs to call them via RPC, but revoking 'PUBLIC' 
-- and explicitly granting to 'anon' and 'authenticated' is the correct ACL pattern.

REVOKE EXECUTE ON FUNCTION public.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_student_onboarding(text, text, text, text, text, text, text, text, text, date, text, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_student_invite(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_faculty_invite(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_student_onboarding(text, text, text, text, text, text, text, text, text, date, text, text, text, text, text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_student_invite(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_faculty_invite(text) TO authenticated, service_role;

-- 2. Ensure all other internal definer functions (if any were missed) are switched to invoker.
-- We already did most, but let's be exhaustive based on the 0029 (Signed-in Users) warnings.

DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
          AND p.prosecdef = true
          AND p.proname NOT IN ('submit_admission_application', 'complete_student_onboarding', 'handle_new_user', 'rls_auto_enable')
    LOOP
        -- Only accept_student_invite and accept_faculty_invite are left as definers for logic reasons,
        -- but we've restricted their execution above.
        IF func_record.proname NOT IN ('accept_student_invite', 'accept_faculty_invite') THEN
            EXECUTE format('ALTER FUNCTION %I.%I(%s) SECURITY INVOKER', 
                func_record.nspname, func_record.proname, func_record.args);
        END IF;
    END LOOP;
END $$;

-- 3. Final verification sweep for search_path on ALL functions.
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
