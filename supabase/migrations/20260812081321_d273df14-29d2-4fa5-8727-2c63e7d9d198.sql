-- Explicitly revoking all privileges first to clear any existing ACLs, then granting only what is necessary.
-- This approach bypasses potential issues with default privileges or partial ACL entries.

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
        -- Revoke all privileges from everyone (including PUBLIC)
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.oid::regprocedure);
        
        -- Grant execute only to authenticated and service_role
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.oid::regprocedure);
    END LOOP;
END $$;
