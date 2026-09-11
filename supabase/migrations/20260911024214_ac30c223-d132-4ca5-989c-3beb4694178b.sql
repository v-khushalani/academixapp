-- 1. allow revision / carry-forward adjustment kinds
ALTER TABLE public.fee_adjustments DROP CONSTRAINT IF EXISTS fee_adjustments_kind_check;
ALTER TABLE public.fee_adjustments ADD CONSTRAINT fee_adjustments_kind_check
  CHECK (kind = ANY (ARRAY['cancel','refund','revision','carry_forward','new_installment']));

-- 2. syllabus section ordering
ALTER TABLE public.syllabus_chapters ADD COLUMN IF NOT EXISTS section_pos integer NOT NULL DEFAULT 0;

UPDATE public.syllabus_chapters sc
   SET section_pos = x.rn
  FROM (
    SELECT batch_id, subject, section,
           row_number() OVER (PARTITION BY batch_id, subject ORDER BY (section IS NOT NULL), section) AS rn
      FROM (SELECT DISTINCT batch_id, subject, section FROM public.syllabus_chapters) d
  ) x
 WHERE sc.batch_id = x.batch_id AND sc.subject = x.subject
   AND sc.section IS NOT DISTINCT FROM x.section;

CREATE OR REPLACE FUNCTION public.set_syllabus_order(_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE it jsonb; ch record;
BEGIN
  FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(_items,'[]'::jsonb)) LOOP
    SELECT * INTO ch FROM public.syllabus_chapters WHERE id = (it->>'id')::uuid;
    CONTINUE WHEN NOT FOUND;
    IF NOT (public.is_superadmin() OR ch.institute_id IN (SELECT public.my_institute_ids())) THEN
      RAISE EXCEPTION 'Not allowed';
    END IF;
    UPDATE public.syllabus_chapters
       SET section = NULLIF(btrim(COALESCE(it->>'section','')), ''),
           section_pos = COALESCE((it->>'section_pos')::int, 0),
           position = COALESCE((it->>'position')::int, position),
           updated_at = now()
     WHERE id = ch.id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_syllabus_order(jsonb) TO authenticated;

-- 3. combined multi-batch installment schedule
CREATE OR REPLACE FUNCTION public.sync_student_batch_fee(_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record; plan jsonb; n int; i int; part jsonb;
  gross numeric := 0; net numeric := 0; locked numeric := 0; remaining numeric := 0;
  free_shares numeric := 0; running numeric := 0; amt numeric; share numeric;
  due date; base_admission date; base_start date;
  keep uuid[]; primary_bid uuid; names text; taken int[]; last_free int := 0;
BEGIN
  SELECT id, batch_id, scholarship_percent, discount, institute_id, admission_date INTO s
    FROM public.students WHERE id = _student_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(array_agg(x), ARRAY[]::uuid[]) INTO keep
    FROM public.student_batch_ids(_student_id) x;

  -- untouched auto-generated bills are always rebuilt from scratch
  DELETE FROM public.fees f
   WHERE f.student_id = s.id
     AND f.batch_id IS NOT NULL
     AND COALESCE(f.amount_paid,0) <= 0
     AND f.status NOT IN ('cancelled','waived');

  IF array_length(keep, 1) IS NULL THEN RETURN; END IF;

  primary_bid := s.batch_id;
  IF primary_bid IS NULL OR NOT (primary_bid = ANY (keep)) THEN primary_bid := keep[1]; END IF;

  SELECT COALESCE(SUM(COALESCE(default_fee,0)), 0), string_agg(name, ' + ' ORDER BY name)
    INTO gross, names
    FROM public.batches WHERE id = ANY (keep);

  net := GREATEST(0, gross
                     - COALESCE(gross * COALESCE(s.scholarship_percent,0) / 100, 0)
                     - COALESCE(s.discount, 0));

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
  base_start := COALESCE(base_start, base_admission);

  -- bills that must be preserved (money collected, or cancelled/waived)
  SELECT COALESCE(SUM(CASE WHEN status IN ('cancelled','waived') THEN 0 ELSE amount END), 0),
         COALESCE(array_agg(installment_no), ARRAY[]::int[])
    INTO locked, taken
    FROM public.fees
   WHERE student_id = s.id AND batch_id IS NOT NULL;

  remaining := GREATEST(0, net - locked);

  FOR i IN 0..n-1 LOOP
    IF NOT ((i+1) = ANY (taken)) THEN
      free_shares := free_shares + GREATEST(0, COALESCE((plan->i->>'share')::numeric, 0));
      last_free := i + 1;
    END IF;
  END LOOP;
  IF free_shares <= 0 THEN free_shares := 1; END IF;

  FOR i IN 0..n-1 LOOP
    CONTINUE WHEN (i+1) = ANY (taken);
    part := plan->i;
    share := GREATEST(0, COALESCE((part->>'share')::numeric, 0));

    IF (i+1) = last_free THEN
      amt := GREATEST(0, remaining - running);
    ELSE
      amt := round(remaining * share / free_shares);
      running := running + amt;
    END IF;

    IF COALESCE(part->>'basis','admission') = 'batch_start' THEN
      due := base_start + COALESCE((part->>'days')::int, 0);
    ELSE
      due := base_admission + COALESCE((part->>'days')::int, 0);
    END IF;

    INSERT INTO public.fees (student_id, batch_id, institute_id, amount, amount_paid,
                             due_date, status, description, installment_no, installment_of)
    VALUES (s.id, primary_bid, s.institute_id, amt, 0, due, 'pending'::fee_status,
            COALESCE(part->>'label', 'Installment ' || (i+1))
              || CASE WHEN names IS NULL THEN '' ELSE ' — ' || names END,
            i+1, n);
  END LOOP;
END;
$$;

-- 4. revise installment: carry difference forward or open a new installment
DROP FUNCTION IF EXISTS public.revise_installment(uuid, numeric, date, boolean, text);

CREATE OR REPLACE FUNCTION public.revise_installment(
  _fee_id uuid,
  _new_amount numeric,
  _new_due_date date DEFAULT NULL,
  _carry_forward boolean DEFAULT true,
  _reason text DEFAULT NULL,
  _mode text DEFAULT 'next'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.fees%ROWTYPE; diff numeric; nxt uuid; mode text; maxno int;
BEGIN
  SELECT * INTO f FROM public.fees WHERE id = _fee_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fee not found'; END IF;

  IF NOT (public.is_superadmin() OR f.institute_id IN (SELECT public.my_institute_ids())) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF _new_amount IS NULL OR _new_amount < 0 THEN
    RAISE EXCEPTION 'Amount must be zero or more';
  END IF;
  IF _new_amount < COALESCE(f.amount_paid, 0) THEN
    RAISE EXCEPTION 'Amount cannot be less than what is already paid';
  END IF;

  mode := COALESCE(NULLIF(_mode, ''), CASE WHEN _carry_forward THEN 'next' ELSE 'none' END);
  diff := f.amount - _new_amount;

  UPDATE public.fees
     SET amount = _new_amount,
         due_date = COALESCE(_new_due_date, due_date),
         status = CASE
           WHEN status IN ('cancelled','waived') THEN status
           WHEN COALESCE(amount_paid,0) >= _new_amount AND _new_amount > 0 THEN 'paid'::fee_status
           WHEN COALESCE(amount_paid,0) > 0 THEN 'partial'::fee_status
           ELSE 'pending'::fee_status
         END,
         updated_at = now()
   WHERE id = _fee_id;

  IF diff <> 0 AND mode = 'next' THEN
    SELECT id INTO nxt
      FROM public.fees
     WHERE student_id = f.student_id
       AND institute_id = f.institute_id
       AND status NOT IN ('paid','cancelled','waived')
       AND id <> _fee_id
       AND COALESCE(installment_no, 0) > COALESCE(f.installment_no, 0)
     ORDER BY installment_no NULLS LAST, due_date NULLS LAST
     LIMIT 1;

    IF nxt IS NOT NULL THEN
      UPDATE public.fees
         SET amount = GREATEST(amount + diff, COALESCE(amount_paid, 0)),
             updated_at = now()
       WHERE id = nxt;
      mode := 'next';
    ELSE
      mode := 'new';
    END IF;
  END IF;

  IF diff > 0 AND mode = 'new' THEN
    SELECT COALESCE(MAX(installment_no), 0) INTO maxno
      FROM public.fees WHERE student_id = f.student_id AND institute_id = f.institute_id;

    INSERT INTO public.fees (student_id, batch_id, institute_id, amount, amount_paid,
                             due_date, status, description, installment_no, installment_of)
    VALUES (f.student_id, f.batch_id, f.institute_id, diff, 0,
            COALESCE(_new_due_date, f.due_date, CURRENT_DATE) + 30,
            'pending'::fee_status,
            'Balance installment', maxno + 1, GREATEST(COALESCE(f.installment_of,1), maxno + 1));

    INSERT INTO public.fee_adjustments (institute_id, fee_id, student_id, kind, amount, reason, created_by)
    VALUES (f.institute_id, _fee_id, f.student_id, 'new_installment', diff, _reason, auth.uid());
  END IF;

  INSERT INTO public.fee_adjustments (institute_id, fee_id, student_id, kind, amount, reason, created_by)
  VALUES (f.institute_id, _fee_id, f.student_id, 'revision', diff, _reason, auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.revise_installment(uuid, numeric, date, boolean, text, text) TO authenticated;