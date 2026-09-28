ALTER TABLE public.timetable_changes ADD COLUMN IF NOT EXISTS published_at timestamptz;
UPDATE public.timetable_changes SET published_at = now() WHERE published_at IS NULL;

DROP POLICY IF EXISTS timetable_changes_batch_read ON public.timetable_changes;
DROP POLICY IF EXISTS timetable_changes_member_read ON public.timetable_changes;
CREATE POLICY timetable_changes_batch_read ON public.timetable_changes FOR SELECT TO authenticated
  USING (published_at IS NOT NULL AND batch_id IN (SELECT public.my_batch_ids()));
CREATE POLICY timetable_changes_member_read ON public.timetable_changes FOR SELECT TO authenticated
  USING (published_at IS NOT NULL AND institute_id IN (SELECT public.my_institute_ids()));

DROP TRIGGER IF EXISTS notify_timetable_change_ins ON public.timetable_changes;
CREATE TRIGGER notify_timetable_change_pub AFTER UPDATE OF published_at ON public.timetable_changes
  FOR EACH ROW WHEN (OLD.published_at IS NULL AND NEW.published_at IS NOT NULL)
  EXECUTE FUNCTION public.notify_timetable_change();

CREATE OR REPLACE FUNCTION public.publish_timetable()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  UPDATE public.timetable_changes SET published_at = now() WHERE institute_id = _inst AND published_at IS NULL;
  INSERT INTO public.notifications (institute_id, kind, title, body, link, created_by)
  VALUES (_inst, 'timetable', 'Timetable updated', 'The timetable has been updated. Please check your classes.', '/portal/timetable', auth.uid());
  RETURN _n;
END $function$;