-- 1. Student / parent portal invites -------------------------------------------------
CREATE TABLE public.student_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'student',
  relation text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  claimed_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX student_invites_student_idx ON public.student_invites(student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_invites TO authenticated;
GRANT ALL ON public.student_invites TO service_role;

ALTER TABLE public.student_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office manages student invites"
ON public.student_invites FOR ALL TO authenticated
USING (
  public.is_superadmin()
  OR (institute_id = public.current_institute_id()
      AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist','counsellor']::app_role[]))
)
WITH CHECK (
  public.is_superadmin()
  OR (institute_id = public.current_institute_id()
      AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist','counsellor']::app_role[]))
);

CREATE TRIGGER student_invites_set_updated_at
BEFORE UPDATE ON public.student_invites
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.get_student_invite(_token text)
RETURNS TABLE(student_name text, institute_name text, kind text, valid boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.full_name, inst.name, i.kind,
         (i.used_at IS NULL AND i.expires_at > now())
  FROM public.student_invites i
  JOIN public.students s ON s.id = i.student_id
  JOIN public.institutes inst ON inst.id = i.institute_id
  WHERE i.token = _token;
$$;

CREATE OR REPLACE FUNCTION public.accept_student_invite(_token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  inv public.student_invites%ROWTYPE;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in first';
  END IF;

  SELECT * INTO inv FROM public.student_invites
  WHERE token = _token AND used_at IS NULL AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This link is invalid or has expired';
  END IF;

  IF inv.kind = 'parent' THEN
    INSERT INTO public.user_roles (user_id, role, institute_id)
    VALUES (uid, 'parent'::app_role, inv.institute_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.parent_students (parent_user_id, student_id, relation, institute_id)
    VALUES (uid, inv.student_id, COALESCE(inv.relation, 'parent'), inv.institute_id)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role, institute_id)
    VALUES (uid, 'student'::app_role, inv.institute_id)
    ON CONFLICT DO NOTHING;

    UPDATE public.students SET user_id = uid WHERE id = inv.student_id;
  END IF;

  UPDATE public.student_invites
     SET used_at = now(), claimed_by = uid
   WHERE id = inv.id;
END;
$$;

-- 2. Plan limits ----------------------------------------------------------------------
ALTER TABLE public.plan_catalog
  ADD COLUMN IF NOT EXISTS staff_login_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS teacher_login_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_limit integer NOT NULL DEFAULT 0;

UPDATE public.plan_catalog SET student_limit = 100, room_limit = 3,
       staff_login_limit = 2, teacher_login_limit = 5, batch_limit = 5
 WHERE key = 'free';
UPDATE public.plan_catalog SET student_limit = 500, room_limit = 10,
       staff_login_limit = 6, teacher_login_limit = 25, batch_limit = 0
 WHERE key = 'growth';
UPDATE public.plan_catalog SET student_limit = 1500, room_limit = 30,
       staff_login_limit = 20, teacher_login_limit = 0, batch_limit = 0
 WHERE key = 'campus';
UPDATE public.plan_catalog SET student_limit = 0, room_limit = 0,
       staff_login_limit = 0, teacher_login_limit = 0, batch_limit = 0
 WHERE key IN ('chain','enterprise');

-- 3. Hardware attendance --------------------------------------------------------------
CREATE TABLE public.attendance_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_devices TO authenticated;
GRANT ALL ON public.attendance_devices TO service_role;

ALTER TABLE public.attendance_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office manages attendance devices"
ON public.attendance_devices FOR ALL TO authenticated
USING (
  public.is_superadmin()
  OR (institute_id = public.current_institute_id()
      AND public.has_any_role(auth.uid(), ARRAY['owner','admin']::app_role[]))
)
WITH CHECK (
  public.is_superadmin()
  OR (institute_id = public.current_institute_id()
      AND public.has_any_role(auth.uid(), ARRAY['owner','admin']::app_role[]))
);

CREATE TRIGGER attendance_devices_set_updated_at
BEFORE UPDATE ON public.attendance_devices
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.student_device_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  uid text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institute_id, uid)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_device_ids TO authenticated;
GRANT ALL ON public.student_device_ids TO service_role;

ALTER TABLE public.student_device_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office manages student device ids"
ON public.student_device_ids FOR ALL TO authenticated
USING (
  public.is_superadmin()
  OR (institute_id = public.current_institute_id()
      AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[]))
)
WITH CHECK (
  public.is_superadmin()
  OR (institute_id = public.current_institute_id()
      AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[]))
);

CREATE TRIGGER student_device_ids_set_updated_at
BEFORE UPDATE ON public.student_device_ids
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';