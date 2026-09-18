-- ========== timetable_changes ==========
CREATE TABLE public.timetable_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL DEFAULT current_institute_id() REFERENCES public.institutes(id) ON DELETE CASCADE,
  date date NOT NULL,
  slot_id uuid REFERENCES public.timetable_slots(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'changed' CHECK (kind IN ('cancelled','changed','extra')),
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE,
  faculty_id uuid REFERENCES public.faculty(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  subject text,
  start_time time,
  end_time time,
  note text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX timetable_changes_slot_date_key
  ON public.timetable_changes (slot_id, date) WHERE slot_id IS NOT NULL;
CREATE INDEX timetable_changes_date_idx ON public.timetable_changes (institute_id, date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_changes TO authenticated;
GRANT ALL ON public.timetable_changes TO service_role;

ALTER TABLE public.timetable_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY timetable_changes_staff_all ON public.timetable_changes
  FOR ALL TO authenticated
  USING (role_in_institute(institute_id, ARRAY['owner'::app_role,'admin'::app_role,'receptionist'::app_role,'counsellor'::app_role,'faculty'::app_role]))
  WITH CHECK (role_in_institute(institute_id, ARRAY['owner'::app_role,'admin'::app_role,'receptionist'::app_role,'counsellor'::app_role,'faculty'::app_role]));

CREATE POLICY timetable_changes_member_read ON public.timetable_changes
  FOR SELECT TO authenticated
  USING (institute_id IN (SELECT my_institute_ids()));

CREATE POLICY timetable_changes_batch_read ON public.timetable_changes
  FOR SELECT TO authenticated
  USING (batch_id IN (SELECT my_batch_ids()));

CREATE POLICY platform_superadmin_all ON public.timetable_changes
  FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE TRIGGER update_timetable_changes_updated_at
  BEFORE UPDATE ON public.timetable_changes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== notifications ==========
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL DEFAULT current_institute_id() REFERENCES public.institutes(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'general' CHECK (kind IN ('timetable','test','fee','general')),
  title text NOT NULL,
  body text,
  link text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_feed_idx ON public.notifications (institute_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_staff_all ON public.notifications
  FOR ALL TO authenticated
  USING (role_in_institute(institute_id, ARRAY['owner'::app_role,'admin'::app_role,'receptionist'::app_role,'counsellor'::app_role,'faculty'::app_role]))
  WITH CHECK (role_in_institute(institute_id, ARRAY['owner'::app_role,'admin'::app_role,'receptionist'::app_role,'counsellor'::app_role,'faculty'::app_role]));

CREATE POLICY notifications_audience_read ON public.notifications
  FOR SELECT TO authenticated
  USING (
    institute_id IN (SELECT my_institute_ids())
    AND (batch_id IS NULL OR batch_id IN (SELECT my_batch_ids()))
  );

CREATE POLICY platform_superadmin_all ON public.notifications
  FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

-- ========== notification_reads ==========
CREATE TABLE public.notification_reads (
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.notification_reads TO authenticated;
GRANT ALL ON public.notification_reads TO service_role;

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_reads_own ON public.notification_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ========== auto notifications ==========
CREATE OR REPLACE FUNCTION public.notify_timetable_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch uuid;
  v_title text;
  v_when text;
BEGIN
  v_batch := COALESCE(NEW.batch_id, (SELECT batch_id FROM public.timetable_slots WHERE id = NEW.slot_id));
  v_when := to_char(NEW.date, 'DD Month YYYY');
  v_title := CASE NEW.kind
    WHEN 'cancelled' THEN 'Class cancelled on ' || v_when
    WHEN 'extra' THEN 'Extra class on ' || v_when
    ELSE 'Timetable changed for ' || v_when
  END;
  INSERT INTO public.notifications (institute_id, batch_id, kind, title, body, link)
  VALUES (
    NEW.institute_id,
    v_batch,
    'timetable',
    v_title,
    TRIM(BOTH ' ' FROM CONCAT_WS(' · ',
      NULLIF(NEW.subject, ''),
      CASE WHEN NEW.start_time IS NOT NULL THEN to_char(NEW.start_time, 'HH12:MI AM') ||
        COALESCE(' – ' || to_char(NEW.end_time, 'HH12:MI AM'), '') END,
      NULLIF(NEW.note, '')
    )),
    '/portal/timetable'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_timetable_change_ins
  AFTER INSERT OR UPDATE ON public.timetable_changes
  FOR EACH ROW EXECUTE FUNCTION public.notify_timetable_change();

CREATE OR REPLACE FUNCTION public.notify_test_scheduled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.batch_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.date = OLD.date AND NEW.title = OLD.title
     AND COALESCE(NEW.subject,'') = COALESCE(OLD.subject,'') AND NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (institute_id, batch_id, kind, title, body, link)
  VALUES (
    NEW.institute_id,
    NEW.batch_id,
    'test',
    CASE WHEN NEW.status = 'cancelled'::test_status
      THEN 'Test cancelled: ' || NEW.title
      ELSE 'Test on ' || to_char(NEW.date, 'DD Month YYYY') || ': ' || NEW.title END,
    TRIM(BOTH ' ' FROM CONCAT_WS(' · ', NULLIF(NEW.subject,''), 'Max marks ' || NEW.max_marks)),
    '/portal/progress'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_test_scheduled_trg
  AFTER INSERT OR UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.notify_test_scheduled();
