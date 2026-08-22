ALTER TABLE public.plan_catalog
  ADD COLUMN IF NOT EXISTS custom_branding boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attendance_devices boolean NOT NULL DEFAULT false;

ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS receipt_paper text NOT NULL DEFAULT 'a5',
  ADD COLUMN IF NOT EXISTS custom_branding boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attendance_devices boolean NOT NULL DEFAULT false;

UPDATE public.plan_catalog
SET custom_branding = (key IN ('growth','campus','chain','pro','multi','unlimited')),
    attendance_devices = (key IN ('growth','campus','chain','pro','multi','unlimited'));

UPDATE public.institutes i
SET custom_branding = COALESCE(p.custom_branding, false),
    attendance_devices = COALESCE(p.attendance_devices, false)
FROM public.plan_catalog p
WHERE p.key = i.plan;

CREATE OR REPLACE FUNCTION public.apply_plan_catalog_to_institute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE p public.plan_catalog%ROWTYPE;
BEGIN
  IF NEW.plan IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.plan IS NOT DISTINCT FROM OLD.plan THEN RETURN NEW; END IF;
  SELECT * INTO p FROM public.plan_catalog WHERE key = NEW.plan LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  NEW.student_limit := p.student_limit;
  NEW.room_limit := p.room_limit;
  NEW.batch_limit := p.batch_limit;
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
         staff_login_limit = NEW.staff_login_limit,
         teacher_login_limit = NEW.teacher_login_limit,
         custom_branding = NEW.custom_branding,
         attendance_devices = NEW.attendance_devices,
         updated_at = now()
   WHERE i.plan = NEW.key;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.lock_institute_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_superadmin() THEN RETURN NEW; END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.student_limit IS DISTINCT FROM OLD.student_limit
     OR NEW.batch_limit IS DISTINCT FROM OLD.batch_limit
     OR NEW.faculty_limit IS DISTINCT FROM OLD.faculty_limit
     OR NEW.room_limit IS DISTINCT FROM OLD.room_limit
     OR NEW.staff_login_limit IS DISTINCT FROM OLD.staff_login_limit
     OR NEW.teacher_login_limit IS DISTINCT FROM OLD.teacher_login_limit
     OR NEW.features IS DISTINCT FROM OLD.features
     OR NEW.custom_branding IS DISTINCT FROM OLD.custom_branding
     OR NEW.attendance_devices IS DISTINCT FROM OLD.attendance_devices
     OR NEW.parent_institute_id IS DISTINCT FROM OLD.parent_institute_id
  THEN
    RAISE EXCEPTION 'Plan, limits and features can only be changed by the Academix team'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.institute_allows_attendance_devices(_institute_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(i.attendance_devices, false)
  FROM public.institutes i
  WHERE i.id = _institute_id;
$function$;

REVOKE ALL ON FUNCTION public.institute_allows_attendance_devices(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.institute_allows_attendance_devices(uuid) TO service_role;

ALTER TABLE public.institutes
  DROP CONSTRAINT IF EXISTS institutes_receipt_paper_check;
ALTER TABLE public.institutes
  ADD CONSTRAINT institutes_receipt_paper_check
  CHECK (receipt_paper IN ('a5','a4-two-up','thermal-80'));
