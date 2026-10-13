DROP POLICY IF EXISTS students_faculty_read ON public.students;
CREATE POLICY students_faculty_read ON public.students FOR SELECT TO authenticated
USING (
  role_in_institute(institute_id, ARRAY['faculty'::app_role])
  AND (
    batch_id IN (SELECT my_faculty_batch_ids())
    OR EXISTS (SELECT 1 FROM public.student_batches sb
               WHERE sb.student_id = students.id
                 AND sb.batch_id IN (SELECT my_faculty_batch_ids()))
  )
);