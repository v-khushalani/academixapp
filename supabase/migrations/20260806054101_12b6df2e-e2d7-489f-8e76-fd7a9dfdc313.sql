-- 1. Installment plan columns
ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS installment_plan jsonb NOT NULL
  DEFAULT '[{"label":"1st installment","share":50,"basis":"admission","days":7},{"label":"2nd installment","share":50,"basis":"batch_start","days":90}]'::jsonb;

ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS installment_plan jsonb;

ALTER TABLE public.fees
  ADD COLUMN IF NOT EXISTS installment_no integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_of integer NOT NULL DEFAULT 1;

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- 2. Unique key per installment instead of per batch
DROP INDEX IF EXISTS public.fees_student_batch_unique;
DROP INDEX IF EXISTS public.fees_student_id_batch_id_key;
ALTER TABLE public.fees DROP CONSTRAINT IF EXISTS fees_student_id_batch_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS fees_student_batch_installment_unique
  ON public.fees (student_id, batch_id, installment_no)
  WHERE batch_id IS NOT NULL;

-- 3. Expand the plan into one fee row per installment
CREATE OR REPLACE FUNCTION public.sync_student_batch_fee(_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s record; b record; net numeric; plan jsonb; n int; i int;
  part jsonb; share numeric; total_share numeric := 0; amt numeric; running numeric := 0;
  due date; base_admission date; base_start date; existing record;
BEGIN
  SELECT id, batch_id, scholarship_percent, discount, institute_id, admission_date INTO s
    FROM public.students WHERE id = _student_id;
  IF NOT FOUND THEN RETURN; END IF;

  DELETE FROM public.fees f
   WHERE f.student_id = s.id
     AND f.batch_id IS NOT NULL
     AND f.batch_id IS DISTINCT FROM s.batch_id
     AND COALESCE(f.amount_paid,0) <= 0;

  IF s.batch_id IS NULL THEN RETURN; END IF;

  SELECT id, name, default_fee, start_date, installment_plan INTO b
    FROM public.batches WHERE id = s.batch_id;
  IF NOT FOUND THEN RETURN; END IF;

  net := GREATEST(0, COALESCE(b.default_fee,0)
                     - COALESCE(b.default_fee * COALESCE(s.scholarship_percent,0)/100, 0)
                     - COALESCE(s.discount,0));

  plan := b.installment_plan;
  IF plan IS NULL OR jsonb_typeof(plan) <> 'array' OR jsonb_array_length(plan) = 0 THEN
    SELECT installment_plan INTO plan FROM public.institutes WHERE id = s.institute_id;
  END IF;
  IF plan IS NULL OR jsonb_typeof(plan) <> 'array' OR jsonb_array_length(plan) = 0 THEN
    plan := '[{"label":"Full fees","share":100,"basis":"admission","days":7}]'::jsonb;
  END IF;

  n := jsonb_array_length(plan);
  FOR i IN 0..n-1 LOOP
    total_share := total_share + GREATEST(0, COALESCE((plan->i->>'share')::numeric, 0));
  END LOOP;
  IF total_share <= 0 THEN total_share := n; END IF;

  base_admission := COALESCE(s.admission_date, CURRENT_DATE);
  base_start := COALESCE(b.start_date, base_admission);

  -- remove surplus installments (only untouched ones)
  DELETE FROM public.fees f
   WHERE f.student_id = s.id AND f.batch_id = s.batch_id
     AND f.installment_no > n AND COALESCE(f.amount_paid,0) <= 0;

  FOR i IN 0..n-1 LOOP
    part := plan->i;
    share := GREATEST(0, COALESCE((part->>'share')::numeric, 0));
    IF share = 0 AND total_share = n THEN share := 1; END IF;
    IF i = n-1 THEN
      amt := GREATEST(0, net - running);
    ELSE
      amt := round(net * share / total_share);
      running := running + amt;
    END IF;

    IF COALESCE(part->>'basis','admission') = 'batch_start' THEN
      due := base_start + COALESCE((part->>'days')::int, 0);
    ELSE
      due := base_admission + COALESCE((part->>'days')::int, 0);
    END IF;

    SELECT * INTO existing FROM public.fees
      WHERE student_id = s.id AND batch_id = s.batch_id AND installment_no = i+1;

    IF FOUND THEN
      UPDATE public.fees
         SET amount = amt,
             installment_of = n,
             due_date = COALESCE(due_date, due),
             description = COALESCE(NULLIF(part->>'label',''), 'Installment ' || (i+1))
                           || ' · ' || b.name,
             status = CASE WHEN status IN ('waived','cancelled') THEN status
                           WHEN COALESCE(amount_paid,0) <= 0 THEN 'pending'::fee_status
                           WHEN COALESCE(amount_paid,0) >= amt THEN 'paid'::fee_status
                           ELSE 'partial'::fee_status END
       WHERE id = existing.id;
    ELSIF net > 0 THEN
      INSERT INTO public.fees (student_id, batch_id, amount, amount_paid, status, description,
                               institute_id, due_date, installment_no, installment_of)
      VALUES (s.id, s.batch_id, amt, 0, 'pending',
              COALESCE(NULLIF(part->>'label',''), 'Installment ' || (i+1)) || ' · ' || b.name,
              s.institute_id, due, i+1, n)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END; $function$;

-- 4. Re-run the plan when a batch's installment plan changes
CREATE OR REPLACE FUNCTION public.recalc_fees_on_batch_fee_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
  FOR s IN SELECT id FROM public.students WHERE batch_id = NEW.id LOOP
    PERFORM public.sync_student_batch_fee(s.id);
  END LOOP;
  RETURN NEW;
END; $function$;

-- 5. Mark absent parents as notified
CREATE OR REPLACE FUNCTION public.mark_attendance_notified(_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.attendance SET notified_at = now()
  WHERE id = ANY(_ids)
    AND (public.is_superadmin() OR institute_id = public.current_institute_id());
$function$;

GRANT EXECUTE ON FUNCTION public.mark_attendance_notified(uuid[]) TO authenticated;