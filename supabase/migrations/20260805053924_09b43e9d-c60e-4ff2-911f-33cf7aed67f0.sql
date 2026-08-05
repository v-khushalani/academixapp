DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['attendance','automation_rules','batches','courses','faculty','fees','homework','leads','notification_logs','parent_students','student_activities','student_documents','students','subjects','test_results','tests','timetable_slots','user_roles']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_tenant_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_superadmin() OR institute_id IS NOT DISTINCT FROM public.current_institute_id()) WITH CHECK (public.is_superadmin() OR institute_id IS NOT DISTINCT FROM public.current_institute_id())',
      t || '_tenant_isolation', t);
  END LOOP;
END $$;