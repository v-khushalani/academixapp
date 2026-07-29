CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL DEFAULT public.default_institute_id(),
  name text NOT NULL,
  capacity integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX rooms_institute_name_key ON public.rooms (institute_id, lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select" ON public.rooms
  FOR SELECT TO authenticated
  USING (institute_id = public.current_institute_id());

CREATE POLICY "rooms_insert" ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    institute_id = public.current_institute_id()
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[])
  );

CREATE POLICY "rooms_update" ON public.rooms
  FOR UPDATE TO authenticated
  USING (
    institute_id = public.current_institute_id()
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[])
  )
  WITH CHECK (institute_id = public.current_institute_id());

CREATE POLICY "rooms_delete" ON public.rooms
  FOR DELETE TO authenticated
  USING (
    institute_id = public.current_institute_id()
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin']::app_role[])
  );

CREATE TRIGGER rooms_set_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.timetable_slots
  ADD COLUMN room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL;

-- Import existing free-text room names as rooms, then link the slots.
INSERT INTO public.rooms (institute_id, name)
SELECT DISTINCT t.institute_id, btrim(t.room)
FROM public.timetable_slots t
WHERE t.room IS NOT NULL AND btrim(t.room) <> ''
ON CONFLICT DO NOTHING;

INSERT INTO public.rooms (institute_id, name)
SELECT DISTINCT b.institute_id, btrim(b.room)
FROM public.batches b
WHERE b.room IS NOT NULL AND btrim(b.room) <> ''
ON CONFLICT DO NOTHING;

UPDATE public.timetable_slots t
SET room_id = r.id
FROM public.rooms r
WHERE r.institute_id = t.institute_id
  AND lower(r.name) = lower(btrim(t.room))
  AND t.room_id IS NULL;

CREATE INDEX timetable_slots_room_id_idx ON public.timetable_slots (room_id);
CREATE INDEX timetable_slots_day_idx ON public.timetable_slots (institute_id, day_of_week);