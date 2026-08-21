DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT DISTINCT tablename FROM pg_policies
    WHERE schemaname='public' AND policyname IN ('Tenant isolation','Tenant restrictive')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Tenant isolation', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Tenant restrictive', t);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['attendance_devices','faculty_invites','fee_adjustments','rooms','student_device_ids','student_invites','syllabus_chapters','syllabus_logs','timetable_day_plan']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_tenant_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_superadmin() OR institute_id IN (SELECT public.my_institute_ids())) WITH CHECK (public.is_superadmin() OR institute_id IN (SELECT public.my_institute_ids()))',
      t||'_tenant_isolation', t);
  END LOOP;
END $$;