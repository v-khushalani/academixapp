CREATE OR REPLACE FUNCTION public.apply_plan_catalog_to_members(_key text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE p public.plan_catalog%ROWTYPE; n integer := 0;
BEGIN
  SELECT * INTO p FROM public.plan_catalog WHERE key = _key LIMIT 1;
  IF NOT FOUND THEN RETURN 0; END IF;

  PERFORM set_config('academix.skip_plan_defaults', 'on', true);

  UPDATE public.institutes i SET
    student_limit = p.student_limit,
    room_limit = p.room_limit,
    batch_limit = p.batch_limit,
    faculty_limit = p.faculty_limit,
    staff_login_limit = p.staff_login_limit,
    teacher_login_limit = p.teacher_login_limit,
    custom_branding = p.custom_branding,
    attendance_devices = p.attendance_devices,
    features = COALESCE(p.features, '{}'::jsonb),
    updated_at = now()
  WHERE i.plan = _key;

  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('academix.skip_plan_defaults', 'off', true);
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.plan_catalog_sync_institutes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.student_limit IS DISTINCT FROM OLD.student_limit
     OR NEW.room_limit IS DISTINCT FROM OLD.room_limit
     OR NEW.batch_limit IS DISTINCT FROM OLD.batch_limit
     OR NEW.faculty_limit IS DISTINCT FROM OLD.faculty_limit
     OR NEW.staff_login_limit IS DISTINCT FROM OLD.staff_login_limit
     OR NEW.teacher_login_limit IS DISTINCT FROM OLD.teacher_login_limit
     OR NEW.custom_branding IS DISTINCT FROM OLD.custom_branding
     OR NEW.attendance_devices IS DISTINCT FROM OLD.attendance_devices
     OR NEW.features IS DISTINCT FROM OLD.features
  THEN
    PERFORM public.apply_plan_catalog_to_members(NEW.key);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plan_catalog_sync_institutes_t ON public.plan_catalog;
CREATE TRIGGER plan_catalog_sync_institutes_t
AFTER UPDATE ON public.plan_catalog
FOR EACH ROW EXECUTE FUNCTION public.plan_catalog_sync_institutes();

CREATE OR REPLACE FUNCTION public.platform_push_plan(_key text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Only the Academix team can push plans.' USING ERRCODE = '42501';
  END IF;
  RETURN public.apply_plan_catalog_to_members(_key);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_plan_catalog_to_members(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_push_plan(text) TO authenticated;