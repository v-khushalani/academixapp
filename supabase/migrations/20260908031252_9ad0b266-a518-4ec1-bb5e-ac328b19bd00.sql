CREATE TABLE IF NOT EXISTS public.student_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, batch_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_batches TO authenticated;
GRANT ALL ON public.student_batches TO service_role;

ALTER TABLE public.student_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_superadmin_all ON public.student_batches
  FOR ALL TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

CREATE POLICY student_batches_office_all ON public.student_batches
  FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner'::app_role,'admin'::app_role,'receptionist'::app_role,'counsellor'::app_role,'accountant'::app_role]))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner'::app_role,'admin'::app_role,'receptionist'::app_role,'counsellor'::app_role,'accountant'::app_role]));

CREATE POLICY student_batches_faculty_read ON public.student_batches
  FOR SELECT TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['faculty'::app_role]) AND batch_id IN (SELECT public.my_faculty_batch_ids()));

CREATE POLICY student_batches_family_read ON public.student_batches
  FOR SELECT TO authenticated USING (public.is_my_student(student_id));

CREATE TRIGGER student_batches_set_updated_at BEFORE UPDATE ON public.student_batches
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS student_batches_batch_idx ON public.student_batches(batch_id);
CREATE INDEX IF NOT EXISTS student_batches_student_idx ON public.student_batches(student_id);

-- backfill from the single-batch column
INSERT INTO public.student_batches (institute_id, student_id, batch_id, is_primary)
SELECT s.institute_id, s.id, s.batch_id, true
FROM public.students s
WHERE s.batch_id IS NOT NULL
ON CONFLICT (student_id, batch_id) DO NOTHING;

-- all batches a student is enrolled in (junction + legacy primary column)
CREATE OR REPLACE FUNCTION public.student_batch_ids(_student_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT batch_id FROM public.student_batches WHERE student_id = _student_id
  UNION
  SELECT batch_id FROM public.students WHERE id = _student_id AND batch_id IS NOT NULL
$$;

-- fees for every enrolled batch
CREATE OR REPLACE FUNCTION public.sync_student_batch_fee(_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  s record; b record; net numeric; plan jsonb; n int; i int;
  part jsonb; share numeric; total_share numeric; amt numeric; running numeric;
  due date; base_admission date; base_start date; existing record;
  bid uuid; keep uuid[];
BEGIN
  SELECT id, batch_id, scholarship_percent, discount, institute_id, admission_date INTO s
    FROM public.students WHERE id = _student_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(array_agg(x), ARRAY[]::uuid[]) INTO keep
    FROM public.student_batch_ids(_student_id) x;

  -- drop untouched fees of batches the student is no longer enrolled in
  DELETE FROM public.fees f
   WHERE f.student_id = s.id
     AND f.batch_id IS NOT NULL
     AND NOT (f.batch_id = ANY (keep))
     AND COALESCE(f.amount_paid,0) <= 0;

  base_admission := COALESCE(s.admission_date, CURRENT_DATE);

  FOREACH bid IN ARRAY keep LOOP
    SELECT id, name, default_fee, start_date, installment_plan INTO b
      FROM public.batches WHERE id = bid;
    CONTINUE WHEN NOT FOUND;

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
    total_share := 0;
    FOR i IN 0..n-1 LOOP
      total_share := total_share + GREATEST(0, COALESCE((plan->i->>'share')::numeric, 0));
    END LOOP;
    IF total_share <= 0 THEN total_share := n; END IF;

    base_start := COALESCE(b.start_date, base_admission);
    running := 0;

    DELETE FROM public.fees f
     WHERE f.student_id = s.id AND f.batch_id = bid
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
        WHERE student_id = s.id AND batch_id = bid AND installment_no = i+1;

      IF FOUND THEN
        UPDATE public.fees
           SET amount = amt,
               installment_of = n,
               due_date = COALESCE(due, existing.due_date),
               description = COALESCE(part->>'label', 'Installment ' || (i+1)) || ' — ' || b.name,
               status = CASE WHEN status IN ('cancelled','waived') THEN status
                             WHEN COALESCE(amount_paid,0) <= 0 THEN 'pending'::fee_status
                             WHEN COALESCE(amount_paid,0) >= amt THEN 'paid'::fee_status
                             ELSE 'partial'::fee_status END
         WHERE id = existing.id;
      ELSE
        INSERT INTO public.fees (student_id, batch_id, institute_id, amount, amount_paid,
                                 due_date, status, description, installment_no, installment_of)
        VALUES (s.id, bid, s.institute_id, amt, 0, due, 'pending'::fee_status,
                COALESCE(part->>'label', 'Installment ' || (i+1)) || ' — ' || b.name, i+1, n);
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- keep the junction in step with the legacy primary batch column
CREATE OR REPLACE FUNCTION public.tg_student_primary_batch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.batch_id IS NOT NULL THEN
    INSERT INTO public.student_batches (institute_id, student_id, batch_id, is_primary)
    VALUES (NEW.institute_id, NEW.id, NEW.batch_id, true)
    ON CONFLICT (student_id, batch_id) DO UPDATE SET is_primary = true;
    UPDATE public.student_batches SET is_primary = false
      WHERE student_id = NEW.id AND batch_id <> NEW.batch_id AND is_primary;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS students_primary_batch ON public.students;
CREATE TRIGGER students_primary_batch AFTER INSERT OR UPDATE OF batch_id ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.tg_student_primary_batch();

CREATE OR REPLACE FUNCTION public.tg_student_batches_fees()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_student_batch_fee(COALESCE(NEW.student_id, OLD.student_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS student_batches_fees ON public.student_batches;
CREATE TRIGGER student_batches_fees AFTER INSERT OR DELETE ON public.student_batches
  FOR EACH ROW EXECUTE FUNCTION public.tg_student_batches_fees();

-- batch fee/plan changes must reach every enrolled student
CREATE OR REPLACE FUNCTION public.recalc_fees_on_batch_fee_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;
