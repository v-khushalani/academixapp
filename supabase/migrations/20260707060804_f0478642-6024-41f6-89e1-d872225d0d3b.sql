
-- Auto-assign batch fees to students on insert/batch change
DROP TRIGGER IF EXISTS trg_students_auto_batch_fee ON public.students;
CREATE TRIGGER trg_students_auto_batch_fee
AFTER INSERT OR UPDATE OF batch_id ON public.students
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_batch_fee();

-- Recompute batch fee amount when scholarship/discount changes on student
CREATE OR REPLACE FUNCTION public.recalc_batch_fee_on_student_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b_fee numeric;
  net numeric;
BEGIN
  IF NEW.batch_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.scholarship_percent IS NOT DISTINCT FROM OLD.scholarship_percent
     AND NEW.discount IS NOT DISTINCT FROM OLD.discount THEN
    RETURN NEW;
  END IF;
  SELECT default_fee INTO b_fee FROM public.batches WHERE id = NEW.batch_id;
  IF b_fee IS NULL OR b_fee <= 0 THEN RETURN NEW; END IF;
  net := GREATEST(0, b_fee - COALESCE(b_fee * NEW.scholarship_percent/100, 0) - COALESCE(NEW.discount, 0));
  UPDATE public.fees
     SET amount = net,
         status = CASE WHEN amount_paid <= 0 THEN 'pending'::fee_status
                       WHEN amount_paid >= net THEN 'paid'::fee_status
                       ELSE 'partial'::fee_status END
   WHERE student_id = NEW.id AND batch_id = NEW.batch_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_students_recalc_fee ON public.students;
CREATE TRIGGER trg_students_recalc_fee
AFTER UPDATE OF scholarship_percent, discount ON public.students
FOR EACH ROW EXECUTE FUNCTION public.recalc_batch_fee_on_student_change();

-- updated_at triggers (defensive)
DROP TRIGGER IF EXISTS set_updated_at_faculty ON public.faculty;
CREATE TRIGGER set_updated_at_faculty BEFORE UPDATE ON public.faculty FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_timetable_slots ON public.timetable_slots;
CREATE TRIGGER set_updated_at_timetable_slots BEFORE UPDATE ON public.timetable_slots FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_batches ON public.batches;
CREATE TRIGGER set_updated_at_batches BEFORE UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_students ON public.students;
CREATE TRIGGER set_updated_at_students BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_fees ON public.fees;
CREATE TRIGGER set_updated_at_fees BEFORE UPDATE ON public.fees FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
