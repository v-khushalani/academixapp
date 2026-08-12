-- 1. Switch EVERY function to SECURITY INVOKER where it doesn't break logic.
-- This is the ONLY way to clear linter issues 0028/0029.
-- For onboarding, we will use a server function (TanStack Start serverFn)
-- to act as the "Elevated Caller" instead of SQL DEFINER.

ALTER FUNCTION public.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) SECURITY INVOKER;
ALTER FUNCTION public.complete_student_onboarding(text, text, text, text, text, text, text, text, text, date, text, text, text, text, text, text, text, text) SECURITY INVOKER;
ALTER FUNCTION public.accept_student_invite(text) SECURITY INVOKER;
ALTER FUNCTION public.accept_faculty_invite(text) SECURITY INVOKER;
ALTER FUNCTION public.handle_new_user() SECURITY INVOKER;
ALTER FUNCTION public.rls_auto_enable() SECURITY INVOKER;

-- 2. Verify all other functions are also INVOKER.
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
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SECURITY INVOKER', 
            func_record.nspname, func_record.proname, func_record.args);
    END LOOP;
END $$;
