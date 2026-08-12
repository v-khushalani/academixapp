-- Final Security Hardening for Production
-- 1. Correct column name in pg_policies is 'qual' and 'with_check' (definition is not a column)
-- 2. Convert all non-essential definer functions to invoker to satisfy linter.

ALTER FUNCTION public.rls_auto_enable() SECURITY INVOKER;
ALTER FUNCTION public.handle_new_user() SECURITY INVOKER;
ALTER FUNCTION public.recalc_batch_fee_on_student_change() SECURITY INVOKER;
ALTER FUNCTION public.recalc_fees_on_batch_fee_change() SECURITY INVOKER;
ALTER FUNCTION public.sync_student_batch_fee(uuid) SECURITY INVOKER;
ALTER FUNCTION public.mark_attendance_notified(uuid[]) SECURITY INVOKER;
ALTER FUNCTION public.set_institute_id() SECURITY INVOKER;
ALTER FUNCTION public.auto_assign_batch_fee() SECURITY INVOKER;
ALTER FUNCTION public.batch_faculty_names(uuid) SECURITY INVOKER;
ALTER FUNCTION public.my_faculty_batch_ids() SECURITY INVOKER;
ALTER FUNCTION public.my_batch_ids() SECURITY INVOKER;
ALTER FUNCTION public.is_my_student(uuid) SECURITY INVOKER;
ALTER FUNCTION public.default_institute_id() SECURITY INVOKER;
ALTER FUNCTION public.enforce_institute_limits() SECURITY INVOKER;
ALTER FUNCTION public.get_my_roles() SECURITY INVOKER;
ALTER FUNCTION public.get_student_invite(text) SECURITY INVOKER;
ALTER FUNCTION public.get_student_by_token(text) SECURITY INVOKER;
ALTER FUNCTION public.get_faculty_invite(text) SECURITY INVOKER;

-- 3. Ensure all functions have search_path set to 'public' to prevent search path hijacking.
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
