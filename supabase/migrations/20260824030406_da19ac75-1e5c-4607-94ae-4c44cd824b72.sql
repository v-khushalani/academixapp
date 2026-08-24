-- 1. faculty limit on the catalog
ALTER TABLE public.plan_catalog ADD COLUMN IF NOT EXISTS faculty_limit integer NOT NULL DEFAULT 0;
UPDATE public.plan_catalog SET faculty_limit = CASE key WHEN 'free' THEN 5 WHEN 'growth' THEN 25 WHEN 'campus' THEN 100 ELSE 0 END WHERE faculty_limit = 0;

-- 2. single source of truth for limit enforcement
DROP TRIGGER IF EXISTS tr_limit_batches ON public.batches;
DROP TRIGGER IF EXISTS tr_limit_rooms ON public.rooms;
DROP TRIGGER IF EXISTS tr_limit_students ON public.students;
DROP TRIGGER IF EXISTS tr_limit_staff ON public.user_roles;
DROP FUNCTION IF EXISTS public.check_plan_limits();

CREATE OR REPLACE FUNCTION public.enforce_institute_limits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE lim integer; used integer; inst uuid; label text;
BEGIN
  inst := NEW.institute_id;
  IF inst IS NULL THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'user_roles' THEN
    IF NEW.role::text IN ('student','parent','superadmin') THEN RETURN NEW; END IF;
    IF NEW.role::text = 'faculty' THEN
      SELECT teacher_login_limit INTO lim FROM public.institutes WHERE id = inst;
      SELECT count(DISTINCT user_id) INTO used FROM public.user_roles
        WHERE institute_id = inst AND role::text = 'faculty' AND user_id <> NEW.user_id;
      label := 'teacher logins';
    ELSE
      SELECT staff_login_limit INTO lim FROM public.institutes WHERE id = inst;
      SELECT count(DISTINCT user_id) INTO used FROM public.user_roles
        WHERE institute_id = inst
          AND role::text IN ('owner','admin','receptionist','counsellor','accountant')
          AND user_id <> NEW.user_id;
      label := 'office logins';
    END IF;
  ELSIF TG_TABLE_NAME = 'students' THEN
    IF COALESCE(NEW.approval_status,'pending') <> 'approved' THEN RETURN NEW; END IF;
    IF NEW.status::text <> 'active' THEN RETURN NEW; END IF;
    SELECT student_limit INTO lim FROM public.institutes WHERE id = inst;
    SELECT count(*) INTO used FROM public.students
      WHERE institute_id = inst AND approval_status = 'approved'
        AND status::text = 'active' AND id <> NEW.id;
    label := 'students';
  ELSIF TG_TABLE_NAME = 'batches' THEN
    SELECT batch_limit INTO lim FROM public.institutes WHERE id = inst;
    SELECT count(*) INTO used FROM public.batches WHERE institute_id = inst AND id <> NEW.id;
    label := 'batches';
  ELSIF TG_TABLE_NAME = 'rooms' THEN
    SELECT room_limit INTO lim FROM public.institutes WHERE id = inst;
    SELECT count(*) INTO used FROM public.rooms WHERE institute_id = inst AND id <> NEW.id;
    label := 'classrooms';
  ELSIF TG_TABLE_NAME = 'faculty' THEN
    SELECT faculty_limit INTO lim FROM public.institutes WHERE id = inst;
    SELECT count(*) INTO used FROM public.faculty WHERE institute_id = inst AND id <> NEW.id;
    label := 'faculty members';
  ELSE
    RETURN NEW;
  END IF;

  IF COALESCE(lim,0) > 0 AND used >= lim THEN
    RAISE EXCEPTION 'Your plan allows % % . Call Academix on 70666 70222 to raise this limit.', lim, label
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $function$;

-- 3. catalog -> institute sync now carries faculty_limit
CREATE OR REPLACE FUNCTION public.apply_plan_catalog_to_institute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE p public.plan_catalog%ROWTYPE;
BEGIN
  IF NEW.plan IS NULL THEN RETURN NEW; END IF;
  IF current_setting('academix.skip_plan_defaults', true) = 'on' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.plan IS NOT DISTINCT FROM OLD.plan THEN RETURN NEW; END IF;
  SELECT * INTO p FROM public.plan_catalog WHERE key = NEW.plan LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  NEW.student_limit := p.student_limit;
  NEW.room_limit := p.room_limit;
  NEW.batch_limit := p.batch_limit;
  NEW.faculty_limit := p.faculty_limit;
  NEW.staff_login_limit := p.staff_login_limit;
  NEW.teacher_login_limit := p.teacher_login_limit;
  NEW.custom_branding := p.custom_branding;
  NEW.attendance_devices := p.attendance_devices;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_institutes_from_plan_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.institutes i
     SET student_limit = NEW.student_limit,
         room_limit = NEW.room_limit,
         batch_limit = NEW.batch_limit,
         faculty_limit = NEW.faculty_limit,
         staff_login_limit = NEW.staff_login_limit,
         teacher_login_limit = NEW.teacher_login_limit,
         custom_branding = NEW.custom_branding,
         attendance_devices = NEW.attendance_devices,
         updated_at = now()
   WHERE i.plan = NEW.key;
  RETURN NEW;
END;
$function$;

-- 4. plan change history
CREATE TABLE IF NOT EXISTS public.plan_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  from_plan text,
  to_plan text,
  from_limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  to_limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.plan_change_log TO authenticated;
GRANT ALL ON public.plan_change_log TO service_role;
ALTER TABLE public.plan_change_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Superadmins read plan changes" ON public.plan_change_log;
CREATE POLICY "Superadmins read plan changes" ON public.plan_change_log
  FOR SELECT TO authenticated USING (public.is_superadmin());
DROP POLICY IF EXISTS "Superadmins write plan changes" ON public.plan_change_log;
CREATE POLICY "Superadmins write plan changes" ON public.plan_change_log
  FOR INSERT TO authenticated WITH CHECK (public.is_superadmin());
CREATE INDEX IF NOT EXISTS plan_change_log_institute_idx ON public.plan_change_log(institute_id, created_at DESC);

-- 5. one super-admin entry point for plan + limits + entitlements + status
CREATE OR REPLACE FUNCTION public.platform_set_plan(
  _id uuid,
  _plan text,
  _student_limit integer,
  _room_limit integer,
  _batch_limit integer,
  _faculty_limit integer,
  _staff_login_limit integer,
  _teacher_login_limit integer,
  _custom_branding boolean,
  _attendance_devices boolean,
  _status text DEFAULT 'active',
  _note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE old_row public.institutes%ROWTYPE;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Only the Academix team can change plans.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO old_row FROM public.institutes WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Institute not found'; END IF;

  PERFORM set_config('academix.skip_plan_defaults', 'on', true);

  UPDATE public.institutes SET
    plan = COALESCE(_plan, plan),
    status = COALESCE(_status, status),
    student_limit = GREATEST(COALESCE(_student_limit, student_limit), 0),
    room_limit = GREATEST(COALESCE(_room_limit, room_limit), 0),
    batch_limit = GREATEST(COALESCE(_batch_limit, batch_limit), 0),
    faculty_limit = GREATEST(COALESCE(_faculty_limit, faculty_limit), 0),
    staff_login_limit = GREATEST(COALESCE(_staff_login_limit, staff_login_limit), 0),
    teacher_login_limit = GREATEST(COALESCE(_teacher_login_limit, teacher_login_limit), 0),
    custom_branding = COALESCE(_custom_branding, custom_branding),
    attendance_devices = COALESCE(_attendance_devices, attendance_devices),
    updated_at = now()
  WHERE id = _id;

  PERFORM set_config('academix.skip_plan_defaults', 'off', true);

  INSERT INTO public.plan_change_log (institute_id, from_plan, to_plan, from_limits, to_limits, note, changed_by)
  VALUES (
    _id, old_row.plan, COALESCE(_plan, old_row.plan),
    jsonb_build_object('students', old_row.student_limit, 'rooms', old_row.room_limit,
      'batches', old_row.batch_limit, 'faculty', old_row.faculty_limit,
      'staffLogins', old_row.staff_login_limit, 'teacherLogins', old_row.teacher_login_limit,
      'customBranding', old_row.custom_branding, 'attendanceDevices', old_row.attendance_devices,
      'status', old_row.status),
    jsonb_build_object('students', GREATEST(COALESCE(_student_limit, old_row.student_limit),0),
      'rooms', GREATEST(COALESCE(_room_limit, old_row.room_limit),0),
      'batches', GREATEST(COALESCE(_batch_limit, old_row.batch_limit),0),
      'faculty', GREATEST(COALESCE(_faculty_limit, old_row.faculty_limit),0),
      'staffLogins', GREATEST(COALESCE(_staff_login_limit, old_row.staff_login_limit),0),
      'teacherLogins', GREATEST(COALESCE(_teacher_login_limit, old_row.teacher_login_limit),0),
      'customBranding', COALESCE(_custom_branding, old_row.custom_branding),
      'attendanceDevices', COALESCE(_attendance_devices, old_row.attendance_devices),
      'status', COALESCE(_status, old_row.status)),
    _note, auth.uid()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.platform_set_plan(uuid, text, integer, integer, integer, integer, integer, integer, boolean, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_set_plan(uuid, text, integer, integer, integer, integer, integer, integer, boolean, boolean, text, text) TO authenticated;

-- 6. platform_institutes exposes everything the console edits
DROP FUNCTION IF EXISTS public.platform_institutes();
CREATE OR REPLACE FUNCTION public.platform_institutes()
RETURNS TABLE(
  id uuid, name text, slug text, plan text, status text, parent_institute_id uuid,
  student_limit integer, room_limit integer, batch_limit integer, faculty_limit integer,
  staff_login_limit integer, teacher_login_limit integer,
  custom_branding boolean, attendance_devices boolean,
  features jsonb, installment_plan jsonb,
  students bigint, batches bigint, rooms bigint, faculty bigint,
  staff_logins bigint, teacher_logins bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT i.id, i.name, i.slug, i.plan, i.status, i.parent_institute_id,
         i.student_limit, i.room_limit, i.batch_limit, i.faculty_limit,
         i.staff_login_limit, i.teacher_login_limit,
         i.custom_branding, i.attendance_devices,
         i.features, i.installment_plan,
         (SELECT count(*) FROM public.students s WHERE s.institute_id = i.id AND s.approval_status = 'approved' AND s.status::text = 'active'),
         (SELECT count(*) FROM public.batches b WHERE b.institute_id = i.id),
         (SELECT count(*) FROM public.rooms r WHERE r.institute_id = i.id),
         (SELECT count(*) FROM public.faculty f WHERE f.institute_id = i.id),
         (SELECT count(DISTINCT ur.user_id) FROM public.user_roles ur WHERE ur.institute_id = i.id AND ur.role::text IN ('owner','admin','receptionist','counsellor','accountant')),
         (SELECT count(DISTINCT ur.user_id) FROM public.user_roles ur WHERE ur.institute_id = i.id AND ur.role::text = 'faculty')
  FROM public.institutes i
  WHERE public.is_superadmin()
  ORDER BY i.name;
$function$;

REVOKE ALL ON FUNCTION public.platform_institutes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_institutes() TO authenticated;