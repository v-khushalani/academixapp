CREATE OR REPLACE FUNCTION public.sync_student_batch_fee(_student_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  s record; plan jsonb; n int; i int; part jsonb;
  gross numeric := 0; net numeric := 0; locked numeric := 0; remaining numeric := 0;
  free_shares numeric := 0; running numeric := 0; amt numeric; share numeric;
  due date; prev_due date; base_admission date; base_start date;
  keep uuid[]; primary_bid uuid; names text; taken int[]; last_free int := 0;
BEGIN
  SELECT id, batch_id, scholarship_percent, discount, institute_id, admission_date INTO s
    FROM public.students WHERE id = _student_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT COALESCE(array_agg(x), ARRAY[]::uuid[]) INTO keep FROM public.student_batch_ids(_student_id) x;
  DELETE FROM public.fees f WHERE f.student_id = s.id AND f.batch_id IS NOT NULL
     AND COALESCE(f.amount_paid,0) <= 0 AND f.status NOT IN ('cancelled','waived');
  IF array_length(keep, 1) IS NULL THEN RETURN; END IF;
  primary_bid := s.batch_id;
  IF primary_bid IS NULL OR NOT (primary_bid = ANY (keep)) THEN primary_bid := keep[1]; END IF;
  SELECT COALESCE(SUM(COALESCE(default_fee,0)), 0), string_agg(name, ' + ' ORDER BY name)
    INTO gross, names FROM public.batches WHERE id = ANY (keep);
  net := GREATEST(0, gross - COALESCE(gross * COALESCE(s.scholarship_percent,0) / 100, 0) - COALESCE(s.discount, 0));
  SELECT installment_plan INTO plan FROM public.batches WHERE id = primary_bid;
  IF plan IS NULL OR jsonb_typeof(plan) <> 'array' OR jsonb_array_length(plan) = 0 THEN
    SELECT installment_plan INTO plan FROM public.institutes WHERE id = s.institute_id;
  END IF;
  IF plan IS NULL OR jsonb_typeof(plan) <> 'array' OR jsonb_array_length(plan) = 0 THEN
    plan := '[{"label":"Full fees","share":100,"basis":"admission","days":7}]'::jsonb;
  END IF;
  n := jsonb_array_length(plan);
  base_admission := COALESCE(s.admission_date, CURRENT_DATE);
  SELECT MIN(start_date) INTO base_start FROM public.batches WHERE id = ANY (keep);
  -- a student who joins after the batch started: batch-start dates count from joining
  base_start := GREATEST(COALESCE(base_start, base_admission), base_admission);
  SELECT COALESCE(SUM(CASE WHEN status IN ('cancelled','waived') THEN 0 ELSE amount END), 0),
         COALESCE(array_agg(installment_no), ARRAY[]::int[]), MAX(due_date)
    INTO locked, taken, prev_due
    FROM public.fees WHERE student_id = s.id AND batch_id IS NOT NULL;
  prev_due := NULL;
  remaining := GREATEST(0, net - locked);
  FOR i IN 0..n-1 LOOP
    IF NOT ((i+1) = ANY (taken)) THEN
      free_shares := free_shares + GREATEST(0, COALESCE((plan->i->>'share')::numeric, 0));
      last_free := i + 1;
    END IF;
  END LOOP;
  IF free_shares <= 0 THEN free_shares := 1; END IF;
  FOR i IN 0..n-1 LOOP
    part := plan->i;
    IF COALESCE(part->>'basis','admission') = 'batch_start' THEN
      due := base_start + COALESCE((part->>'days')::int, 0);
    ELSE
      due := base_admission + COALESCE((part->>'days')::int, 0);
    END IF;
    -- never let a later installment fall before an earlier one
    IF prev_due IS NOT NULL AND due <= prev_due THEN due := prev_due + 30; END IF;
    IF (i+1) = ANY (taken) THEN
      SELECT COALESCE(MAX(due_date), due) INTO due FROM public.fees
       WHERE student_id = s.id AND batch_id IS NOT NULL AND installment_no = i+1;
      prev_due := due; CONTINUE;
    END IF;
    prev_due := due;
    share := GREATEST(0, COALESCE((part->>'share')::numeric, 0));
    IF (i+1) = last_free THEN amt := GREATEST(0, remaining - running);
    ELSE amt := round(remaining * share / free_shares); running := running + amt; END IF;
    INSERT INTO public.fees (student_id, batch_id, institute_id, amount, amount_paid,
                             due_date, status, description, installment_no, installment_of)
    VALUES (s.id, primary_bid, s.institute_id, amt, 0, due, 'pending'::fee_status,
            COALESCE(part->>'label', 'Installment ' || (i+1)) || CASE WHEN names IS NULL THEN '' ELSE ' — ' || names END,
            i+1, n);
  END LOOP;
END;
$function$;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT DISTINCT student_id FROM public.fees WHERE batch_id IS NOT NULL LOOP
    PERFORM public.sync_student_batch_fee(r.student_id);
  END LOOP;
END $$;