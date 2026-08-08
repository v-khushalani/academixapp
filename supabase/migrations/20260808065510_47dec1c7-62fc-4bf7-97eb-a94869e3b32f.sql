-- retire outdated admission RPC overloads (app uses the institute-aware one)
DROP FUNCTION IF EXISTS public.submit_admission_application(text,text,text,text,date,text,text,text,text,text,text,text,text,text,text);
DROP FUNCTION IF EXISTS public.submit_admission_application(text,text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,numeric);

DO $$
DECLARE f record;
  public_fns text[] := ARRAY[
    'submit_admission_application','get_student_by_token','complete_student_onboarding',
    'get_faculty_invite','get_student_invite'
  ];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig, p.proname
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f.sig);
    IF f.proname = ANY(public_fns) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', f.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;