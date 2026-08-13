GRANT EXECUTE ON FUNCTION public.my_institute_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_institute_id() TO authenticated;
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('has_role','get_my_roles','is_superadmin','my_role_in')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;