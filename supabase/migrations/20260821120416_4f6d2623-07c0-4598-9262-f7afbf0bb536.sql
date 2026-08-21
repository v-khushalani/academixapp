-- 1. Faculty: remove broad permissive policies that gave any institute member full access
DROP POLICY IF EXISTS "Tenant isolation" ON public.faculty;
DROP POLICY IF EXISTS "Tenant restrictive" ON public.faculty;
DROP POLICY IF EXISTS "faculty_tenant_isolation" ON public.faculty;
DROP POLICY IF EXISTS "Faculty read for staff" ON public.faculty;
DROP POLICY IF EXISTS "Faculty write for owner/admin" ON public.faculty;

CREATE POLICY "Faculty finance read" ON public.faculty
FOR SELECT TO authenticated
USING (
  public.is_superadmin()
  OR (
    institute_id IN (SELECT public.my_institute_ids())
    AND public.has_any_role((SELECT auth.uid()), ARRAY['owner','admin','accountant']::app_role[])
  )
);

CREATE POLICY "Faculty read own record" ON public.faculty
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Faculty write for owner/admin" ON public.faculty
FOR ALL TO authenticated
USING (
  public.is_superadmin()
  OR (
    institute_id IN (SELECT public.my_institute_ids())
    AND public.has_any_role((SELECT auth.uid()), ARRAY['owner','admin']::app_role[])
  )
)
WITH CHECK (
  public.is_superadmin()
  OR (
    institute_id IN (SELECT public.my_institute_ids())
    AND public.has_any_role((SELECT auth.uid()), ARRAY['owner','admin']::app_role[])
  )
);

-- 2. Salary-free staff directory for other staff roles
CREATE OR REPLACE VIEW public.faculty_directory
WITH (security_barrier = true) AS
SELECT f.id, f.institute_id, f.user_id, f.full_name, f.email, f.phone,
       f.subject, f.qualification, f.joining_date, f.status, f.created_at, f.updated_at
FROM public.faculty f
WHERE public.is_superadmin()
   OR (
     f.institute_id IN (SELECT public.my_institute_ids())
     AND public.has_any_role((SELECT auth.uid()), ARRAY['owner','admin','accountant','faculty','receptionist','counsellor']::app_role[])
   );

REVOKE ALL ON public.faculty_directory FROM anon;
GRANT SELECT ON public.faculty_directory TO authenticated;
GRANT SELECT ON public.faculty_directory TO service_role;

-- 3. Stop unauthenticated visitors from executing internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.group_overview() FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_institutes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.platform_set_parent(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revise_installment(uuid, numeric, date, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_active_institute(uuid) FROM anon;