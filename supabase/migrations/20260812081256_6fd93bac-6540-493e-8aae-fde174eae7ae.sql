-- Final surgical attempt at revoking execute. 
-- Using OID selection to be absolutely certain we hit the right function objects.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.oid, p.proname 
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.prosecdef = true 
        AND p.proname IN (
            'set_institute_id', 
            'reorder_syllabus_chapters', 
            'collect_fee_payment', 
            'check_plan_limits', 
            'get_dashboard_overview', 
            'get_institute_usage', 
            'process_faculty_salaries', 
            'platform_update_institute'
        )
    ) LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.oid::regprocedure);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.oid::regprocedure);
    END LOOP;
END $$;
