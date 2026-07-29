ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS room_limit integer NOT NULL DEFAULT 3;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role::text = 'superadmin'
  );
$$;

CREATE TABLE IF NOT EXISTS public.timetable_day_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL DEFAULT public.current_institute_id(),
  date date NOT NULL,
  slot_id uuid REFERENCES public.timetable_slots(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  faculty_id uuid REFERENCES public.faculty(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  subject text,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS timetable_day_plan_slot_date_idx
  ON public.timetable_day_plan (slot_id, date) WHERE slot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS timetable_day_plan_date_idx ON public.timetable_day_plan (institute_id, date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_day_plan TO authenticated;
GRANT ALL ON public.timetable_day_plan TO service_role;

ALTER TABLE public.timetable_day_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "day_plan_select" ON public.timetable_day_plan
  FOR SELECT TO authenticated USING (institute_id = public.current_institute_id());
CREATE POLICY "day_plan_write" ON public.timetable_day_plan
  FOR ALL TO authenticated
  USING (institute_id = public.current_institute_id()
         AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[]))
  WITH CHECK (institute_id = public.current_institute_id()
         AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[]));

DROP TRIGGER IF EXISTS trg_day_plan_updated_at ON public.timetable_day_plan;
CREATE TRIGGER trg_day_plan_updated_at BEFORE UPDATE ON public.timetable_day_plan
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS platform_superadmin_all ON public.%I', t);
    EXECUTE format('CREATE POLICY platform_superadmin_all ON public.%I FOR ALL TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin())', t);
  END LOOP;
END $$;