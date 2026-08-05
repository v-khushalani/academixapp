ALTER TABLE public.fees DROP CONSTRAINT IF EXISTS fees_amount_positive;
ALTER TABLE public.fees ADD CONSTRAINT fees_amount_positive CHECK (amount >= 0) NOT VALID;

CREATE OR REPLACE FUNCTION public.approve_admission(_student_id uuid, _batch_id uuid, _token_amount numeric DEFAULT NULL::numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE tok numeric; fee_row record;
BEGIN
  IF NOT (public.is_superadmin() OR public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[])) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  UPDATE public.students
     SET approval_status = 'approved',
         status = 'active'::student_status,
         intent = 'admission',
         batch_id = COALESCE(_batch_id, batch_id),
         admission_date = COALESCE(admission_date, CURRENT_DATE),
         token_amount = COALESCE(_token_amount, token_amount)
   WHERE id = _student_id
   RETURNING token_amount INTO tok;

  IF NOT FOUND THEN RAISE EXCEPTION 'Applicant not found'; END IF;

  PERFORM public.sync_student_batch_fee(_student_id);

  IF COALESCE(tok,0) > 0 THEN
    SELECT * INTO fee_row FROM public.fees
     WHERE student_id = _student_id AND batch_id = (SELECT batch_id FROM public.students WHERE id = _student_id)
     LIMIT 1;
    IF FOUND AND COALESCE(fee_row.amount_paid,0) <= 0 THEN
      UPDATE public.fees
         SET amount_paid = LEAST(tok, amount),
             paid_date = CURRENT_DATE,
             receipt_no = COALESCE(receipt_no, 'RCP-' || to_char(now(),'YYMMDD') || '-' || substr(md5(random()::text),1,4)),
             status = CASE WHEN LEAST(tok, amount) >= amount THEN 'paid'::fee_status ELSE 'partial'::fee_status END
       WHERE id = fee_row.id;
    END IF;
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.set_student_approval(_student_id uuid, _decision text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_superadmin() OR public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[])) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF _decision NOT IN ('approved','rejected','pending','enquiry') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  UPDATE public.students
     SET approval_status = _decision,
         status = CASE WHEN _decision = 'approved' THEN 'active'::student_status ELSE status END
   WHERE id = _student_id;
END; $function$;