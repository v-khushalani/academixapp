-- 1. Institutes ---------------------------------------------------------
CREATE TABLE public.institutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  tagline text,
  address text,
  phone text,
  email text,
  academic_year text,
  primary_color text,
  upi_id text,
  upi_name text,
  plan text NOT NULL DEFAULT 'trial',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.institutes TO authenticated;
GRANT ALL ON public.institutes TO service_role;
ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER institutes_set_updated_at
BEFORE UPDATE ON public.institutes
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed the default institute for existing data
INSERT INTO public.institutes (name, slug, academic_year)
VALUES ('Your Institute', 'default', to_char(now(),'YYYY') || '-' || to_char(now() + interval '1 year','YY'));

-- user_roles needs the column before the tenant helper can reference it
ALTER TABLE public.user_roles ADD COLUMN institute_id uuid REFERENCES public.institutes(id) ON DELETE CASCADE;

-- 2. Tenant helpers ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.default_institute_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.institutes ORDER BY created_at, id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_institute_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT ur.institute_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.institute_id IS NOT NULL LIMIT 1),
    (SELECT i.id FROM public.institutes i ORDER BY i.created_at, i.id LIMIT 1)
  );
$$;

-- 3. Add institute_id everywhere, backfill, default + not null -----------
DO $do$
DECLARE t text; def uuid;
BEGIN
  SELECT id INTO def FROM public.institutes ORDER BY created_at, id LIMIT 1;
  FOREACH t IN ARRAY ARRAY[
    'user_roles','students','batches','courses','subjects','faculty','fees',
    'attendance','tests','test_results','timetable_slots','homework','leads',
    'notification_logs','automation_rules','parent_students',
    'student_activities','student_documents'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS institute_id uuid REFERENCES public.institutes(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE public.%I SET institute_id = %L', t, def);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN institute_id SET DEFAULT public.current_institute_id()', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN institute_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX %I ON public.%I (institute_id)', 'idx_' || t || '_institute', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (institute_id = public.current_institute_id()) WITH CHECK (institute_id = public.current_institute_id())',
      t || '_tenant_isolation', t);
  END LOOP;
END $do$;

-- user_roles default must not self-reference during signup provisioning
ALTER TABLE public.user_roles ALTER COLUMN institute_id SET DEFAULT public.default_institute_id();

-- 4. Institute policies --------------------------------------------------
CREATE POLICY "Institute members can read their institute"
ON public.institutes FOR SELECT TO authenticated
USING (id = public.current_institute_id());

CREATE POLICY "Owner/admin can update their institute"
ON public.institutes FOR UPDATE TO authenticated
USING (id = public.current_institute_id() AND public.has_any_role(auth.uid(), ARRAY['owner','admin']::app_role[]))
WITH CHECK (id = public.current_institute_id());

-- 5. Signup: create an institute when requested --------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inst_name text;
  inst uuid;
  is_first boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );

  inst_name := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'institute_name','')), '');
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;

  IF inst_name IS NOT NULL THEN
    INSERT INTO public.institutes (name, slug, academic_year)
    VALUES (
      inst_name,
      regexp_replace(lower(inst_name), '[^a-z0-9]+', '-', 'g') || '-' || substr(md5(NEW.id::text), 1, 5),
      to_char(now(),'YYYY') || '-' || to_char(now() + interval '1 year','YY')
    )
    RETURNING id INTO inst;
    INSERT INTO public.user_roles (user_id, role, institute_id)
    VALUES (NEW.id, 'owner', inst), (NEW.id, 'admin', inst);
  ELSIF is_first THEN
    inst := public.default_institute_id();
    INSERT INTO public.user_roles (user_id, role, institute_id)
    VALUES (NEW.id, 'owner', inst), (NEW.id, 'admin', inst);
  END IF;

  RETURN NEW;
END; $$;