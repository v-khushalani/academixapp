CREATE TABLE public.timetable_published (
  id uuid PRIMARY KEY,
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE,
  faculty_id uuid REFERENCES public.faculty(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  subject text,
  room text,
  day_of_week smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.timetable_published(institute_id);
GRANT SELECT ON public.timetable_published TO authenticated;
GRANT ALL ON public.timetable_published TO service_role;
ALTER TABLE public.timetable_published ENABLE ROW LEVEL SECURITY;
CREATE POLICY tp_member_read ON public.timetable_published FOR SELECT TO authenticated
  USING (institute_id IN (SELECT public.my_institute_ids()));
CREATE POLICY tp_batch_read ON public.timetable_published FOR SELECT TO authenticated
  USING (batch_id IN (SELECT public.my_batch_ids()));
CREATE POLICY tp_superadmin ON public.timetable_published FOR SELECT TO authenticated
  USING (public.is_superadmin());

INSERT INTO public.timetable_published (id, institute_id, batch_id, faculty_id, room_id, subject, room, day_of_week, start_time, end_time)
SELECT id, institute_id, batch_id, faculty_id, room_id, subject, room, day_of_week, start_time, end_time FROM public.timetable_slots;

CREATE OR REPLACE FUNCTION public.publish_timetable()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inst uuid := public.current_institute_id(); _n integer;
BEGIN
  IF _inst IS NULL OR NOT public.role_in_institute(_inst, ARRAY['owner','admin','receptionist','counsellor']::app_role[]) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  DELETE FROM public.timetable_published WHERE institute_id = _inst;
  INSERT INTO public.timetable_published (id, institute_id, batch_id, faculty_id, room_id, subject, room, day_of_week, start_time, end_time)
  SELECT id, institute_id, batch_id, faculty_id, room_id, subject, room, day_of_week, start_time, end_time
  FROM public.timetable_slots WHERE institute_id = _inst;
  GET DIAGNOSTICS _n = ROW_COUNT;
  INSERT INTO public.notifications (institute_id, kind, title, body, link, created_by)
  VALUES (_inst, 'timetable', 'Timetable updated', 'The weekly timetable has been updated. Please check your classes.', '/portal/timetable', auth.uid());
  RETURN _n;
END $$;
REVOKE EXECUTE ON FUNCTION public.publish_timetable() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.publish_timetable() TO authenticated;