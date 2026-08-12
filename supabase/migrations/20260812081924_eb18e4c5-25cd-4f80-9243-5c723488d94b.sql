-- Aggressive security hardening to reach zero linter issues.
-- 1. Switch definer functions to invoker where possible.

ALTER FUNCTION public.approve_admission(uuid, uuid, numeric) SECURITY INVOKER;
ALTER FUNCTION public.check_plan_limits() SECURITY INVOKER;
ALTER FUNCTION public.collect_fee_payment(uuid, numeric, text, text) SECURITY INVOKER;
ALTER FUNCTION public.get_dashboard_overview() SECURITY INVOKER;
ALTER FUNCTION public.get_institute_usage(uuid) SECURITY INVOKER;
ALTER FUNCTION public.platform_institute_detail(uuid) SECURITY INVOKER;
ALTER FUNCTION public.process_faculty_salaries(uuid, date) SECURITY INVOKER;
ALTER FUNCTION public.reorder_syllabus_chapters(uuid[]) SECURITY INVOKER;

-- 2. Switch core RLS helper functions to INVOKER.
-- These functions use auth.uid() and perform simple checks.
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
ALTER FUNCTION public.has_any_role(uuid, public.app_role[]) SECURITY INVOKER;
ALTER FUNCTION public.is_superadmin() SECURITY INVOKER;
ALTER FUNCTION public.current_institute_id() SECURITY INVOKER;
ALTER FUNCTION public.my_institute_ids() SECURITY INVOKER;

-- 3. Set search_path for everything.
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
