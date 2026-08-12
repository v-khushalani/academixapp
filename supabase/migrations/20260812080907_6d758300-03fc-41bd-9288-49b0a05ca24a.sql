
-- 1. Correct any remaining functions with missing search_path
ALTER FUNCTION public.batch_faculty_names(uuid) SET search_path = public;
ALTER FUNCTION public.default_institute_id() SET search_path = public;

-- 2. Explicitly revoke EXECUTE from PUBLIC for all SECURITY DEFINER functions
-- and grant strictly to authenticated and service_role.
-- This addresses the linter's concern about functions being callable by anon/public.

DO $$
BEGIN
    -- Function: batch_faculty_names(uuid)
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.batch_faculty_names(uuid) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.batch_faculty_names(uuid) TO authenticated, service_role';

    -- Function: default_institute_id()
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.default_institute_id() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.default_institute_id() TO authenticated, service_role';

    -- Function: rls_auto_enable()
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO authenticated, service_role';

    -- Function: sync_student_batch_fee(uuid)
    -- (Verify signature from previous read: sync_student_batch_fee(_student_id uuid))
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.sync_student_batch_fee(uuid) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.sync_student_batch_fee(uuid) TO authenticated, service_role';

    -- Function: platform_update_institute with complex signatures
    -- Signature 1: platform_update_institute(uuid, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean, text)
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.platform_update_institute(uuid, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean, text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.platform_update_institute(uuid, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean, text) TO authenticated, service_role';
    
    -- Signature 2: platform_update_institute(uuid, text, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean)
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.platform_update_institute(uuid, text, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.platform_update_institute(uuid, text, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean) TO authenticated, service_role';

    -- Function: submit_admission_application
    -- Arguments: _full_name text, _phone text, _email text, _class text, _dob date, _school text, _father_name text, _father_phone text, _mother_name text, _mother_phone text, _address text, _program text, _stream text, _photo_path text, _preferred_contact text, _intent text, _token_amount numeric, _institute_slug text
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) TO PUBLIC'; -- Explicitly public as it is an admission form
END $$;
