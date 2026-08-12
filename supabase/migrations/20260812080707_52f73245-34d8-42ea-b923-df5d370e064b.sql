
-- Fix search_path for set_institute_id function
ALTER FUNCTION public.set_institute_id() SET search_path = public;

-- Revoke public execution for sensitive SECURITY DEFINER functions
-- and grant only to authenticated and service_role.

DO $$
BEGIN
    -- Functions with no arguments
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.current_institute_id() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.current_institute_id() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.my_institute_ids() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.my_institute_ids() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.my_batch_ids() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.my_batch_ids() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.my_faculty_batch_ids() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.my_faculty_batch_ids() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.platform_institutes() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.platform_institutes() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_dashboard_overview() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_dashboard_overview() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.check_plan_limits() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.check_plan_limits() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.enforce_institute_limits() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.enforce_institute_limits() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.auto_assign_batch_fee() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.auto_assign_batch_fee() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.recalc_fees_on_batch_fee_change() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.recalc_fees_on_batch_fee_change() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.recalc_batch_fee_on_student_change() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.recalc_batch_fee_on_student_change() TO authenticated, service_role';

    -- Functions with arguments
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.is_my_student(uuid) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_my_student(uuid) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_institute_usage(uuid) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_institute_usage(uuid) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.platform_institute_detail(uuid) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.platform_institute_detail(uuid) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.approve_admission(uuid, uuid, numeric) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.approve_admission(uuid, uuid, numeric) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.set_student_approval(uuid, text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_student_approval(uuid, text) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.collect_fee_payment(uuid, numeric, text, text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.collect_fee_payment(uuid, numeric, text, text) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.reorder_syllabus_chapters(uuid[]) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.reorder_syllabus_chapters(uuid[]) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.sync_student_batch_fee(uuid) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.sync_student_batch_fee(uuid) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) TO authenticated, service_role';
END $$;
