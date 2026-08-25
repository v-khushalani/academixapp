-- 1. Per-plan default feature set
ALTER TABLE public.plan_catalog ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Global (network-wide) kill switches
CREATE TABLE IF NOT EXISTS public.platform_feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_feature_flags TO authenticated;
GRANT SELECT ON public.platform_feature_flags TO anon;
GRANT ALL ON public.platform_feature_flags TO service_role;

ALTER TABLE public.platform_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read platform flags" ON public.platform_feature_flags;
CREATE POLICY "Anyone can read platform flags"
  ON public.platform_feature_flags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only Academix can write platform flags" ON public.platform_feature_flags;
CREATE POLICY "Only Academix can write platform flags"
  ON public.platform_feature_flags FOR ALL TO authenticated
  USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

DROP TRIGGER IF EXISTS trg_platform_feature_flags_updated ON public.platform_feature_flags;
CREATE TRIGGER trg_platform_feature_flags_updated
  BEFORE UPDATE ON public.platform_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Plan defaults flow into institutes on plan change
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
  NEW.features := COALESCE(p.features, '{}'::jsonb);
  RETURN NEW;
END;
$function$;

-- 4. Super-admin plan + feature save
CREATE OR REPLACE FUNCTION public.platform_set_plan(
  _id uuid, _plan text, _student_limit integer, _room_limit integer, _batch_limit integer,
  _faculty_limit integer, _staff_login_limit integer, _teacher_login_limit integer,
  _custom_branding boolean, _attendance_devices boolean,
  _status text DEFAULT 'active'::text, _note text DEFAULT NULL::text,
  _features jsonb DEFAULT NULL::jsonb)
 RETURNS void
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
    features = COALESCE(_features, features),
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
      'status', old_row.status, 'features', old_row.features),
    jsonb_build_object('students', GREATEST(COALESCE(_student_limit, old_row.student_limit),0),
      'rooms', GREATEST(COALESCE(_room_limit, old_row.room_limit),0),
      'batches', GREATEST(COALESCE(_batch_limit, old_row.batch_limit),0),
      'faculty', GREATEST(COALESCE(_faculty_limit, old_row.faculty_limit),0),
      'staffLogins', GREATEST(COALESCE(_staff_login_limit, old_row.staff_login_limit),0),
      'teacherLogins', GREATEST(COALESCE(_teacher_login_limit, old_row.teacher_login_limit),0),
      'customBranding', COALESCE(_custom_branding, old_row.custom_branding),
      'attendanceDevices', COALESCE(_attendance_devices, old_row.attendance_devices),
      'status', COALESCE(_status, old_row.status),
      'features', COALESCE(_features, old_row.features)),
    _note, auth.uid()
  );
END;
$function$;

-- 5. Catalog edits push feature defaults to institutes on that plan
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

-- 6. Resolved features for the caller's institute (global AND institute)
CREATE OR REPLACE FUNCTION public.my_features()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT i.features FROM public.institutes i WHERE i.id = public.current_institute_id()),
    '{}'::jsonb
  ) - COALESCE(
    (SELECT array_agg(f.key) FROM public.platform_feature_flags f WHERE f.enabled = false),
    ARRAY[]::text[]
  );
$function$;

GRANT EXECUTE ON FUNCTION public.my_features() TO authenticated;