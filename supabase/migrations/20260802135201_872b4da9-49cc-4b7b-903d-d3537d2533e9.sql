CREATE TABLE public.syllabus_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE DEFAULT public.current_institute_id(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  subject text NOT NULL,
  title text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  planned_sessions integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done')),
  started_on date,
  completed_on date,
  completed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.syllabus_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE DEFAULT public.current_institute_id(),
  chapter_id uuid NOT NULL REFERENCES public.syllabus_chapters(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE,
  faculty_id uuid REFERENCES public.faculty(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  slot_id uuid REFERENCES public.timetable_slots(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.syllabus_chapters TO authenticated;
GRANT ALL ON public.syllabus_chapters TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.syllabus_logs TO authenticated;
GRANT ALL ON public.syllabus_logs TO service_role;

ALTER TABLE public.syllabus_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_syllabus_chapters_batch ON public.syllabus_chapters (batch_id, subject, position);
CREATE INDEX idx_syllabus_logs_chapter ON public.syllabus_logs (chapter_id, date DESC);

CREATE TRIGGER trg_syllabus_chapters_updated_at BEFORE UPDATE ON public.syllabus_chapters
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_syllabus_logs_updated_at BEFORE UPDATE ON public.syllabus_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- chapters
CREATE POLICY "superadmin all chapters" ON public.syllabus_chapters FOR ALL TO authenticated
  USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

CREATE POLICY "staff manage chapters" ON public.syllabus_chapters FOR ALL TO authenticated
  USING (institute_id = public.current_institute_id()
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist','counsellor']::app_role[]))
  WITH CHECK (institute_id = public.current_institute_id()
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist','counsellor']::app_role[]));

CREATE POLICY "faculty read chapters" ON public.syllabus_chapters FOR SELECT TO authenticated
  USING (institute_id = public.current_institute_id()
    AND public.has_role(auth.uid(), 'faculty'));

CREATE POLICY "faculty update own batch chapters" ON public.syllabus_chapters FOR UPDATE TO authenticated
  USING (institute_id = public.current_institute_id()
    AND public.has_role(auth.uid(), 'faculty')
    AND batch_id IN (SELECT public.my_faculty_batch_ids()))
  WITH CHECK (institute_id = public.current_institute_id()
    AND batch_id IN (SELECT public.my_faculty_batch_ids()));

CREATE POLICY "family read batch chapters" ON public.syllabus_chapters FOR SELECT TO authenticated
  USING (batch_id IN (SELECT public.my_batch_ids()));

-- logs
CREATE POLICY "superadmin all logs" ON public.syllabus_logs FOR ALL TO authenticated
  USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

CREATE POLICY "staff manage logs" ON public.syllabus_logs FOR ALL TO authenticated
  USING (institute_id = public.current_institute_id()
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist','counsellor']::app_role[]))
  WITH CHECK (institute_id = public.current_institute_id()
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist','counsellor']::app_role[]));

CREATE POLICY "faculty read logs" ON public.syllabus_logs FOR SELECT TO authenticated
  USING (institute_id = public.current_institute_id() AND public.has_role(auth.uid(), 'faculty'));

CREATE POLICY "faculty insert logs" ON public.syllabus_logs FOR INSERT TO authenticated
  WITH CHECK (institute_id = public.current_institute_id()
    AND public.has_role(auth.uid(), 'faculty')
    AND batch_id IN (SELECT public.my_faculty_batch_ids()));