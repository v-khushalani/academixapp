-- 1. parent -> student links
CREATE TABLE public.parent_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relation text NOT NULL DEFAULT 'guardian',
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_user_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_students TO authenticated;
GRANT ALL ON public.parent_students TO service_role;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parent links: read own or staff"
  ON public.parent_students FOR SELECT TO authenticated
  USING (parent_user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist','counsellor','accountant']::app_role[]));

CREATE POLICY "Parent links: admin manage"
  ON public.parent_students FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[]));

CREATE TRIGGER update_parent_students_updated_at
  BEFORE UPDATE ON public.parent_students
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2. helper: is this student linked to me (as the student, or as a parent)?
CREATE OR REPLACE FUNCTION public.is_my_student(_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = _student_id AND s.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.parent_students ps
    WHERE ps.student_id = _student_id AND ps.parent_user_id = auth.uid()
  );
$$;

-- batch ids the current user (student or parent) is entitled to see
CREATE OR REPLACE FUNCTION public.my_batch_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT s.batch_id FROM public.students s
  WHERE s.batch_id IS NOT NULL
    AND (
      s.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.student_id = s.id AND ps.parent_user_id = auth.uid())
    );
$$;

-- batch ids assigned to the signed-in faculty member
CREATE OR REPLACE FUNCTION public.my_faculty_batch_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id FROM public.batches b
  JOIN public.faculty f ON f.id = b.faculty_id
  WHERE f.user_id = auth.uid();
$$;

-- 3. homework
CREATE TABLE public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  subject text,
  due_date date,
  attachment_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework TO authenticated;
GRANT ALL ON public.homework TO service_role;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Homework staff read"
  ON public.homework FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','faculty','receptionist','counsellor','accountant']::app_role[]));

CREATE POLICY "Homework staff write"
  ON public.homework FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','faculty']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin','faculty']::app_role[]));

CREATE POLICY "Homework: my batch read"
  ON public.homework FOR SELECT TO authenticated
  USING (batch_id IN (SELECT public.my_batch_ids()));

CREATE TRIGGER update_homework_updated_at
  BEFORE UPDATE ON public.homework
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4. student / parent read policies on existing tables
CREATE POLICY "Students: own record read"
  ON public.students FOR SELECT TO authenticated
  USING (public.is_my_student(id));

CREATE POLICY "Attendance: own read"
  ON public.attendance FOR SELECT TO authenticated
  USING (public.is_my_student(student_id));

CREATE POLICY "Test results: own read"
  ON public.test_results FOR SELECT TO authenticated
  USING (public.is_my_student(student_id));

CREATE POLICY "Fees: own read"
  ON public.fees FOR SELECT TO authenticated
  USING (public.is_my_student(student_id));

CREATE POLICY "Batches: my batch read"
  ON public.batches FOR SELECT TO authenticated
  USING (id IN (SELECT public.my_batch_ids()));

CREATE POLICY "Timetable: my batch read"
  ON public.timetable_slots FOR SELECT TO authenticated
  USING (batch_id IN (SELECT public.my_batch_ids()));

CREATE POLICY "Tests: my batch read"
  ON public.tests FOR SELECT TO authenticated
  USING (batch_id IN (SELECT public.my_batch_ids()));

-- 5. faculty scoping: teachers can read students of their own batches
CREATE POLICY "Students: faculty batch read"
  ON public.students FOR SELECT TO authenticated
  USING (batch_id IN (SELECT public.my_faculty_batch_ids()));
