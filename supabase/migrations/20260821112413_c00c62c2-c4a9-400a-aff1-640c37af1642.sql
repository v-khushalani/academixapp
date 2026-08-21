ALTER TYPE public.notification_status ADD VALUE IF NOT EXISTS 'ignored';

ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS queue_key text,
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

CREATE INDEX IF NOT EXISTS notification_logs_queue_key_idx
  ON public.notification_logs (institute_id, queue_key);

CREATE OR REPLACE FUNCTION public.revise_installment(
  _fee_id uuid,
  _new_amount numeric,
  _new_due_date date DEFAULT NULL,
  _carry_forward boolean DEFAULT false,
  _reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.fees%ROWTYPE;
  diff numeric;
  nxt uuid;
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

  IF _carry_forward AND diff <> 0 THEN
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
    END IF;
  END IF;

  INSERT INTO public.fee_adjustments (institute_id, fee_id, student_id, kind, amount, reason, created_by)
  VALUES (f.institute_id, _fee_id, f.student_id, 'revision', diff, _reason, auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.revise_installment(uuid, numeric, date, boolean, text) FROM public;
GRANT EXECUTE ON FUNCTION public.revise_installment(uuid, numeric, date, boolean, text) TO authenticated;