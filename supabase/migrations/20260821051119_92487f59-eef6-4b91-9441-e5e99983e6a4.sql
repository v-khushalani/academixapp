CREATE OR REPLACE FUNCTION public.sync_institutes_from_plan_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.institutes i
     SET student_limit = NEW.student_limit,
         room_limit = NEW.room_limit,
         batch_limit = NEW.batch_limit,
         staff_login_limit = NEW.staff_login_limit,
         teacher_login_limit = NEW.teacher_login_limit,
         updated_at = now()
   WHERE i.plan = NEW.key;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_institutes_from_plan_catalog ON public.plan_catalog;
CREATE TRIGGER trg_sync_institutes_from_plan_catalog
AFTER UPDATE ON public.plan_catalog
FOR EACH ROW EXECUTE FUNCTION public.sync_institutes_from_plan_catalog();

CREATE OR REPLACE FUNCTION public.apply_plan_catalog_to_institute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_plan_catalog_to_institute ON public.institutes;
CREATE TRIGGER trg_apply_plan_catalog_to_institute
BEFORE INSERT OR UPDATE OF plan ON public.institutes
FOR EACH ROW EXECUTE FUNCTION public.apply_plan_catalog_to_institute();