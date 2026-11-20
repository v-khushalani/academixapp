CREATE OR REPLACE FUNCTION public.settle_student_full(_student_id uuid, _discount numeric, _method text DEFAULT 'Cash', _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inst uuid; total numeric := 0; disc numeric; left_d numeric; r record; cut numeric; rcpt text; paid_now numeric := 0;
BEGIN
  SELECT institute_id INTO inst FROM public.students WHERE id = _student_id;
  IF inst IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  IF NOT (public.is_superadmin() OR public.role_in_institute(inst, ARRAY['owner','admin','accountant','receptionist']::app_role[])) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  PERFORM 1 FROM public.fees WHERE student_id = _student_id AND institute_id = inst FOR UPDATE;
  SELECT COALESCE(SUM(amount - COALESCE(amount_paid,0)),0) INTO total FROM public.fees
   WHERE student_id = _student_id AND institute_id = inst AND status NOT IN ('paid','cancelled','waived') AND amount > COALESCE(amount_paid,0);
  IF total <= 0 THEN RETURN jsonb_build_object('received',0,'discount',0); END IF;
  disc := GREATEST(0, COALESCE(_discount,0));
  IF disc >= total THEN RAISE EXCEPTION 'Discount must be less than the balance'; END IF;
  left_d := disc;
  rcpt := 'RCP-' || to_char(now(),'YYMMDD') || '-' || substr(md5(random()::text),1,4);
  FOR r IN SELECT * FROM public.fees WHERE student_id = _student_id AND institute_id = inst
            AND status NOT IN ('paid','cancelled','waived') AND amount > COALESCE(amount_paid,0)
           ORDER BY installment_no DESC, due_date DESC NULLS LAST LOOP
    cut := LEAST(left_d, r.amount - COALESCE(r.amount_paid,0));
    left_d := left_d - cut;
    IF cut > 0 THEN
      INSERT INTO public.fee_adjustments (institute_id, fee_id, student_id, kind, amount, reason, created_by)
      VALUES (inst, r.id, _student_id, 'revision', cut, COALESCE(_reason,'Full-payment discount'), auth.uid());
    END IF;
    paid_now := paid_now + (r.amount - cut - COALESCE(r.amount_paid,0));
    IF r.amount - cut <= 0 THEN
      UPDATE public.fees SET amount = 0, status = 'waived', updated_at = now() WHERE id = r.id;
    ELSE
      UPDATE public.fees SET amount = r.amount - cut, amount_paid = r.amount - cut, status = 'paid',
        paid_date = CURRENT_DATE, method = _method, receipt_no = rcpt, updated_at = now() WHERE id = r.id;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('received', paid_now, 'discount', disc, 'receipt_no', rcpt);
END; $$;
REVOKE ALL ON FUNCTION public.settle_student_full(uuid, numeric, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.settle_student_full(uuid, numeric, text, text) TO authenticated;