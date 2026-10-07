CREATE OR REPLACE FUNCTION public._settle_partial_fee_core(_fee_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f public.fees%ROWTYPE; rem numeric; nxt uuid; maxno int; lastdue date;
BEGIN
  SELECT * INTO f FROM public.fees WHERE id = _fee_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF f.status IN ('cancelled','waived') THEN RETURN; END IF;
  rem := COALESCE(f.amount,0) - COALESCE(f.amount_paid,0);
  IF COALESCE(f.amount_paid,0) <= 0 OR rem <= 0 THEN RETURN; END IF;

  UPDATE public.fees SET amount = amount_paid, status = 'paid'::fee_status, updated_at = now()
   WHERE id = f.id;

  SELECT id INTO nxt FROM public.fees
   WHERE student_id = f.student_id AND institute_id = f.institute_id AND id <> f.id
     AND status NOT IN ('paid','cancelled','waived')
     AND COALESCE(installment_no,0) > COALESCE(f.installment_no,0)
   ORDER BY installment_no, due_date NULLS LAST LIMIT 1;

  IF nxt IS NOT NULL THEN
    UPDATE public.fees SET amount = amount + rem,
      status = CASE WHEN COALESCE(amount_paid,0) > 0 THEN 'partial'::fee_status ELSE status END,
      updated_at = now() WHERE id = nxt;
    INSERT INTO public.fee_adjustments (institute_id, fee_id, student_id, kind, amount, reason, created_by)
    VALUES (f.institute_id, f.id, f.student_id, 'carry_forward', rem, 'Balance moved to next installment', auth.uid());
  ELSE
    SELECT COALESCE(MAX(installment_no),0), MAX(due_date) INTO maxno, lastdue
      FROM public.fees WHERE student_id = f.student_id AND institute_id = f.institute_id;
    INSERT INTO public.fees (student_id, batch_id, institute_id, amount, amount_paid, due_date, status,
                             description, installment_no, installment_of)
    VALUES (f.student_id, f.batch_id, f.institute_id, rem, 0,
            GREATEST(COALESCE(lastdue, CURRENT_DATE), CURRENT_DATE) + 30, 'pending'::fee_status,
            CASE (maxno+1) WHEN 2 THEN '2nd' WHEN 3 THEN '3rd' ELSE (maxno+1)||'th' END || ' installment (balance)'
              || COALESCE(substring(f.description from ' — .*$'), ''),
            maxno + 1, maxno + 1);
    UPDATE public.fees SET installment_of = maxno + 1
     WHERE student_id = f.student_id AND institute_id = f.institute_id AND installment_of < maxno + 1;
    INSERT INTO public.fee_adjustments (institute_id, fee_id, student_id, kind, amount, reason, created_by)
    VALUES (f.institute_id, f.id, f.student_id, 'new_installment', rem, 'Balance moved to a new installment', auth.uid());
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public._settle_partial_fee_core(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.settle_partial_fee(_fee_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inst uuid;
BEGIN
  SELECT institute_id INTO inst FROM public.fees WHERE id = _fee_id;
  IF inst IS NULL THEN RAISE EXCEPTION 'Fee not found'; END IF;
  IF NOT (public.is_superadmin() OR public.role_in_institute(inst, ARRAY['owner','admin','receptionist','counsellor']::app_role[])) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  PERFORM public._settle_partial_fee_core(_fee_id);
END; $$;
REVOKE ALL ON FUNCTION public.settle_partial_fee(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.settle_partial_fee(uuid) TO authenticated;

-- keep balance installments alive when the schedule is rebuilt
CREATE OR REPLACE FUNCTION public.sync_student_batch_fee(_student_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  s record; plan jsonb; n int; i int; part jsonb;
  gross numeric := 0; net numeric := 0; locked numeric := 0; remaining numeric := 0;
  free_shares numeric := 0; running numeric := 0; amt numeric; share numeric;
  due date; prev_due date; base_admission date; base_start date;
  keep uuid[]; primary_bid uuid; names text; taken int[]; last_free int := 0; maxno int; lastdue date;
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
  base_start := GREATEST(COALESCE(base_start, base_admission), base_admission);
  SELECT COALESCE(SUM(CASE WHEN status IN ('cancelled','waived') THEN 0 ELSE amount END), 0),
         COALESCE(array_agg(installment_no), ARRAY[]::int[])
    INTO locked, taken
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
  -- every plan slot already settled but money still due: keep a balance installment
  IF last_free = 0 AND remaining > 0 THEN
    SELECT COALESCE(MAX(installment_no),0), MAX(due_date) INTO maxno, lastdue
      FROM public.fees WHERE student_id = s.id;
    INSERT INTO public.fees (student_id, batch_id, institute_id, amount, amount_paid,
                             due_date, status, description, installment_no, installment_of)
    VALUES (s.id, primary_bid, s.institute_id, remaining, 0,
            GREATEST(COALESCE(lastdue, CURRENT_DATE), CURRENT_DATE) + 30, 'pending'::fee_status,
            CASE (maxno+1) WHEN 2 THEN '2nd' WHEN 3 THEN '3rd' ELSE (maxno+1)||'th' END || ' installment (balance)'
              || CASE WHEN names IS NULL THEN '' ELSE ' — ' || names END,
            maxno+1, maxno+1);
    UPDATE public.fees SET installment_of = maxno+1 WHERE student_id = s.id AND installment_of < maxno+1;
  END IF;
END;
$function$;

-- convert every existing partial installment
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM public.fees WHERE status = 'partial'
             ORDER BY student_id, installment_no LOOP
    PERFORM public._settle_partial_fee_core(r.id);
  END LOOP;
  -- chains: a carried amount may land on another part-paid row
  FOR r IN SELECT id FROM public.fees WHERE status = 'partial' ORDER BY student_id, installment_no LOOP
    PERFORM public._settle_partial_fee_core(r.id);
  END LOOP;
END $$;