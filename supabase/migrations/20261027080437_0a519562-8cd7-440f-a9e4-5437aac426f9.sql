ALTER TABLE public.timetable_slots ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'class';
ALTER TABLE public.timetable_slots DROP CONSTRAINT IF EXISTS timetable_slots_kind_check;
ALTER TABLE public.timetable_slots ADD CONSTRAINT timetable_slots_kind_check CHECK (kind IN ('class','test','self_study'));
ALTER TABLE public.timetable_published ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'class';
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS timetable_published_at timestamptz;

CREATE OR REPLACE FUNCTION public.publish_timetable()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _inst uuid := public.current_institute_id(); _n integer;
BEGIN
  IF _inst IS NULL OR NOT public.role_in_institute(_inst, ARRAY['owner','admin','receptionist','counsellor']::app_role[]) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  DELETE FROM public.timetable_published WHERE institute_id = _inst;
  INSERT INTO public.timetable_published (id, institute_id, batch_id, faculty_id, room_id, subject, room, day_of_week, start_time, end_time, kind)
  SELECT id, institute_id, batch_id, faculty_id, room_id, subject, room, day_of_week, start_time, end_time, kind
  FROM public.timetable_slots WHERE institute_id = _inst;
  GET DIAGNOSTICS _n = ROW_COUNT;
  UPDATE public.timetable_changes SET published_at = now() WHERE institute_id = _inst AND published_at IS NULL;
  UPDATE public.institutes SET timetable_published_at = now() WHERE id = _inst;
  INSERT INTO public.notifications (institute_id, kind, title, body, link, created_by)
  VALUES (_inst, 'timetable', 'Timetable updated', 'The timetable has been updated. Please check your classes.', '/portal/timetable', auth.uid());
  RETURN _n;
END $function$;

CREATE OR REPLACE FUNCTION public.student_timetable_published_at(_student_id uuid)
 RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT i.timetable_published_at FROM public.students s
  JOIN public.institutes i ON i.id = s.institute_id
  WHERE s.id = _student_id AND public.is_my_student(_student_id)
$$;
REVOKE EXECUTE ON FUNCTION public.student_timetable_published_at(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.student_timetable_published_at(uuid) TO authenticated;