ALTER TABLE public.syllabus_chapters ADD COLUMN IF NOT EXISTS section text;

DROP TRIGGER IF EXISTS trg_batches_recalc_fees ON public.batches;
CREATE TRIGGER trg_batches_recalc_fees
AFTER UPDATE OF default_fee, start_date, installment_plan, name ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.recalc_fees_on_batch_fee_change();

DROP TRIGGER IF EXISTS trg_students_auto_batch_fee ON public.students;
CREATE TRIGGER trg_students_auto_batch_fee
AFTER INSERT OR UPDATE OF batch_id, scholarship_percent, discount, admission_date ON public.students
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_batch_fee();

CREATE OR REPLACE FUNCTION public.auto_assign_batch_fee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.batch_id IS NOT DISTINCT FROM OLD.batch_id
     AND NEW.scholarship_percent IS NOT DISTINCT FROM OLD.scholarship_percent
     AND NEW.discount IS NOT DISTINCT FROM OLD.discount
     AND NEW.admission_date IS NOT DISTINCT FROM OLD.admission_date THEN
    RETURN NEW;
  END IF;
  PERFORM public.sync_student_batch_fee(NEW.id);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.recalc_fees_on_batch_fee_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE s record;
BEGIN
  IF NEW.default_fee IS NOT DISTINCT FROM OLD.default_fee
     AND NEW.name IS NOT DISTINCT FROM OLD.name
     AND NEW.installment_plan IS NOT DISTINCT FROM OLD.installment_plan
     AND NEW.start_date IS NOT DISTINCT FROM OLD.start_date THEN
    RETURN NEW;
  END IF;
  FOR s IN
    SELECT id FROM public.students WHERE batch_id = NEW.id
    UNION
    SELECT student_id AS id FROM public.student_batches WHERE batch_id = NEW.id
  LOOP
    PERFORM public.sync_student_batch_fee(s.id);
  END LOOP;
  RETURN NEW;
END;
$function$;