-- 1. Fix recursive / RLS-bound helpers (cause of the students query timeout)
CREATE OR REPLACE FUNCTION public.is_my_student(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = _student_id
      AND (s.user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.parent_students ps
                       WHERE ps.student_id = _student_id AND ps.parent_user_id = auth.uid()))
  );
$$;

CREATE OR REPLACE FUNCTION public.my_faculty_batch_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT b.id
  FROM public.batches b
  WHERE b.faculty_id = auth.uid()
     OR b.faculty_id IN (SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid())
     OR b.id IN (
        SELECT ts.batch_id FROM public.timetable_slots ts
        WHERE ts.batch_id IS NOT NULL
          AND ts.faculty_id IN (SELECT f2.id FROM public.faculty f2 WHERE f2.user_id = auth.uid())
     );
$$;

-- 2. Institute-aware role helper
CREATE OR REPLACE FUNCTION public.role_in_institute(_institute_id uuid, _roles app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _institute_id IS NOT NULL
     AND _institute_id IN (SELECT public.my_institute_ids())
     AND EXISTS (SELECT 1 FROM public.user_roles ur
                  WHERE ur.user_id = auth.uid() AND ur.role = ANY(_roles));
$$;
REVOKE ALL ON FUNCTION public.role_in_institute(uuid, app_role[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.role_in_institute(uuid, app_role[]) TO authenticated, service_role;

-- 3. STUDENTS
DROP POLICY IF EXISTS "Students staff read" ON public.students;
DROP POLICY IF EXISTS "Students admin write" ON public.students;
DROP POLICY IF EXISTS "students_tenant_isolation" ON public.students;
DROP POLICY IF EXISTS "Students: faculty batch read" ON public.students;
CREATE POLICY students_office_all ON public.students FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner','admin','receptionist','counsellor','accountant']::app_role[]))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner','admin','receptionist','counsellor','accountant']::app_role[]));
CREATE POLICY students_faculty_read ON public.students FOR SELECT TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['faculty']::app_role[])
         AND batch_id IN (SELECT public.my_faculty_batch_ids()));

-- 4. ATTENDANCE
DROP POLICY IF EXISTS "Attendance staff read" ON public.attendance;
DROP POLICY IF EXISTS "Attendance staff write" ON public.attendance;
DROP POLICY IF EXISTS "attendance_tenant_isolation" ON public.attendance;
CREATE POLICY attendance_staff_all ON public.attendance FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner','admin','receptionist','counsellor','faculty']::app_role[]))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner','admin','receptionist','counsellor','faculty']::app_role[]));

-- 5. FEES
DROP POLICY IF EXISTS "Fees accountant write" ON public.fees;
DROP POLICY IF EXISTS "Fees staff read" ON public.fees;
DROP POLICY IF EXISTS "Fees: own read" ON public.fees;
DROP POLICY IF EXISTS "fees_tenant_isolation" ON public.fees;
CREATE POLICY fees_office_all ON public.fees FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner','admin','accountant','receptionist']::app_role[]))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner','admin','accountant','receptionist']::app_role[]));
CREATE POLICY fees_family_read ON public.fees FOR SELECT TO authenticated
  USING (public.is_my_student(student_id));

-- 6. BATCHES
DROP POLICY IF EXISTS "Batches admin write" ON public.batches;
DROP POLICY IF EXISTS "Batches isolation" ON public.batches;
DROP POLICY IF EXISTS "batches_tenant_isolation" ON public.batches;
CREATE POLICY batches_office_all ON public.batches FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner','admin','receptionist','counsellor']::app_role[]))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner','admin','receptionist','counsellor']::app_role[]));

-- 7. TESTS + RESULTS
DROP POLICY IF EXISTS "Tests faculty write" ON public.tests;
DROP POLICY IF EXISTS "tests_tenant_isolation" ON public.tests;
CREATE POLICY tests_staff_all ON public.tests FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner','admin','faculty']::app_role[]))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner','admin','faculty']::app_role[]));

DROP POLICY IF EXISTS "Results faculty write" ON public.test_results;
DROP POLICY IF EXISTS "Results staff read" ON public.test_results;
DROP POLICY IF EXISTS "test_results_tenant_isolation" ON public.test_results;
CREATE POLICY results_staff_all ON public.test_results FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner','admin','faculty','receptionist','counsellor']::app_role[]))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner','admin','faculty','receptionist','counsellor']::app_role[]));

-- 8. HOMEWORK
DROP POLICY IF EXISTS "Homework staff read" ON public.homework;
DROP POLICY IF EXISTS "Homework staff write" ON public.homework;
DROP POLICY IF EXISTS "homework_tenant_isolation" ON public.homework;
CREATE POLICY homework_staff_all ON public.homework FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner','admin','faculty']::app_role[]))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner','admin','faculty']::app_role[]));
CREATE POLICY homework_member_read ON public.homework FOR SELECT TO authenticated
  USING (institute_id IN (SELECT public.my_institute_ids()));

-- 9. LEADS
DROP POLICY IF EXISTS "Leads staff access" ON public.leads;
DROP POLICY IF EXISTS "leads_tenant_isolation" ON public.leads;
CREATE POLICY leads_office_all ON public.leads FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner','admin','receptionist','counsellor']::app_role[]))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner','admin','receptionist','counsellor']::app_role[]));

-- 10. NOTIFICATION LOGS
DROP POLICY IF EXISTS "Notification logs staff read" ON public.notification_logs;
DROP POLICY IF EXISTS "Notification logs staff write" ON public.notification_logs;
DROP POLICY IF EXISTS "notification_logs_tenant_isolation" ON public.notification_logs;
CREATE POLICY notif_staff_all ON public.notification_logs FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner','admin','receptionist','counsellor','accountant','faculty']::app_role[]))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner','admin','receptionist','counsellor','accountant','faculty']::app_role[]));
CREATE POLICY notif_family_read ON public.notification_logs FOR SELECT TO authenticated
  USING (student_id IS NOT NULL AND public.is_my_student(student_id));

-- 11. PARENT LINKS
DROP POLICY IF EXISTS "Parent links: admin manage" ON public.parent_students;
DROP POLICY IF EXISTS "Parent links: read own or staff" ON public.parent_students;
DROP POLICY IF EXISTS "parent_students_tenant_isolation" ON public.parent_students;
CREATE POLICY parent_links_office_all ON public.parent_students FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner','admin','receptionist','counsellor']::app_role[]))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner','admin','receptionist','counsellor']::app_role[]));
CREATE POLICY parent_links_own_read ON public.parent_students FOR SELECT TO authenticated
  USING (parent_user_id = (SELECT auth.uid()));

-- 12. PROFILES
DROP POLICY IF EXISTS "Profiles: read own or staff can read all" ON public.profiles;

-- 13. TIMETABLE (was readable by every signed-in user)
DROP POLICY IF EXISTS "Timetable read for authenticated" ON public.timetable_slots;
DROP POLICY IF EXISTS "Timetable write for owner/admin" ON public.timetable_slots;
DROP POLICY IF EXISTS "timetable_slots_tenant_isolation" ON public.timetable_slots;
CREATE POLICY timetable_member_read ON public.timetable_slots FOR SELECT TO authenticated
  USING (institute_id IN (SELECT public.my_institute_ids()));
CREATE POLICY timetable_office_all ON public.timetable_slots FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner','admin','receptionist','counsellor']::app_role[]))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner','admin','receptionist','counsellor']::app_role[]));

-- 14. USER ROLES (was cross-tenant manageable)
DROP POLICY IF EXISTS "UserRoles: admin manage" ON public.user_roles;
DROP POLICY IF EXISTS "UserRoles: read own or admin all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_tenant_isolation" ON public.user_roles;
CREATE POLICY user_roles_admin_manage ON public.user_roles FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner','admin']::app_role[]))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner','admin']::app_role[]));

-- 15. Syllabus: drop over-broad blanket policies (scoped ones already exist)
DROP POLICY IF EXISTS "syllabus_chapters_tenant_isolation" ON public.syllabus_chapters;
DROP POLICY IF EXISTS "syllabus_logs_tenant_isolation" ON public.syllabus_logs;

-- 16. Invites / devices: drop blanket policies, office-scoped ones already exist
DROP POLICY IF EXISTS "attendance_devices_tenant_isolation" ON public.attendance_devices;
DROP POLICY IF EXISTS "student_device_ids_tenant_isolation" ON public.student_device_ids;
DROP POLICY IF EXISTS "student_invites_tenant_isolation" ON public.student_invites;
DROP POLICY IF EXISTS "faculty_invites_tenant_isolation" ON public.faculty_invites;