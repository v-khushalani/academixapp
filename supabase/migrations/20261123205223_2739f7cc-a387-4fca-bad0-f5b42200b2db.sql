CREATE OR REPLACE FUNCTION public.exit_student(_student_id uuid, _collect numeric DEFAULT 0, _method text DEFAULT 'Cash', _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE inst uuid; total numeric := 0; left_c numeric; r record; due numeric; take numeric; rcpt text := NULL; collected numeric := 0; waived numeric := 0;
BEGIN
  SELECT institute_id INTO inst FROM public.students WHERE id = _student_id;
  IF inst IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  IF NOT (public.is_superadmin() OR public.role_in_institute(inst, ARRAY['owner','admin','accountant','receptionist']::app_role[])) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  PERFORM 1 FROM public.fees WHERE student_id = _student_id AND institute_id = inst FOR UPDATE;
  SELECT COALESCE(SUM(amount - COALESCE(amount_paid,0)),0) INTO total FROM public.fees
   WHERE student_id=_student_id AND institute_id=inst AND status NOT IN ('paid','cancelled','waived') AND amount > COALESCE(amount_paid,0);
  left_c := GREATEST(0, COALESCE(_collect,0));
  IF left_c > total THEN RAISE EXCEPTION 'Payment exceeds the balance'; END IF;
  IF left_c > 0 THEN rcpt := 'RCP-' || to_char(now(),'YYMMDD') || '-' || substr(md5(random()::text),1,4); END IF;
  FOR r IN SELECT * FROM public.fees WHERE student_id=_student_id AND institute_id=inst
     AND status NOT IN ('paid','cancelled','waived') AND amount > COALESCE(amount_paid,0)
     ORDER BY installment_no, due_date NULLS LAST LOOP
    due := r.amount - COALESCE(r.amount_paid,0);
    take := LEAST(left_c, due); left_c := left_c - take; collected := collected + take;
    IF due - take > 0 THEN
      INSERT INTO public.fee_adjustments (institute_id, fee_id, student_id, kind, amount, reason, created_by)
      VALUES (inst, r.id, _student_id, 'revision', due - take, 'Waived on exit: ' || COALESCE(_reason,'Discontinued'), auth.uid());
      waived := waived + (due - take);
    END IF;
    IF COALESCE(r.amount_paid,0) + take > 0 THEN
      UPDATE public.fees SET amount = COALESCE(r.amount_paid,0) + take, amount_paid = COALESCE(r.amount_paid,0) + take,
        status='paid', schedule_protected=true,
        paid_date = CASE WHEN take > 0 THEN CURRENT_DATE ELSE paid_date END,
        method = CASE WHEN take > 0 THEN _method ELSE method END,
        receipt_no = CASE WHEN take > 0 THEN rcpt ELSE receipt_no END,
        description = COALESCE(description,'') || ' (closed on exit)', updated_at=now() WHERE id=r.id;
    ELSE
      UPDATE public.fees SET status='waived', schedule_protected=true, updated_at=now() WHERE id=r.id;
    END IF;
  END LOOP;
  UPDATE public.students SET status='dropped',
    notes = trim(both E'\n' from COALESCE(notes,'') || E'\nExited ' || to_char(CURRENT_DATE,'DD Mon YYYY') || COALESCE(': ' || _reason,'')),
    updated_at=now() WHERE id=_student_id;
  RETURN jsonb_build_object('collected', collected, 'waived', waived, 'receipt_no', rcpt);
END; $$;

CREATE OR REPLACE FUNCTION public.readmit_student(_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE inst uuid;
BEGIN
  SELECT institute_id INTO inst FROM public.students WHERE id=_student_id;
  IF inst IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  IF NOT (public.is_superadmin() OR public.role_in_institute(inst, ARRAY['owner','admin','receptionist']::app_role[])) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.students SET status='active',
    notes = trim(both E'\n' from COALESCE(notes,'') || E'\nRe-admitted ' || to_char(CURRENT_DATE,'DD Mon YYYY')), updated_at=now()
   WHERE id=_student_id;
END; $$;

REVOKE ALL ON FUNCTION public.exit_student(uuid,numeric,text,text) FROM public, anon;
REVOKE ALL ON FUNCTION public.readmit_student(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.exit_student(uuid,numeric,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.readmit_student(uuid) TO authenticated;

-- Cleanup: dropped students' leftover unpaid bills
INSERT INTO public.fee_adjustments (institute_id, fee_id, student_id, kind, amount, reason)
SELECT f.institute_id, f.id, f.student_id, 'revision', f.amount - COALESCE(f.amount_paid,0), 'Waived on exit: Discontinued (cleanup)'
FROM public.fees f JOIN public.students s ON s.id=f.student_id
WHERE s.status='dropped' AND f.status NOT IN ('paid','cancelled','waived') AND f.amount > COALESCE(f.amount_paid,0);
UPDATE public.fees f SET status = CASE WHEN COALESCE(f.amount_paid,0) > 0 THEN 'paid'::fee_status ELSE 'waived'::fee_status END,
  amount = CASE WHEN COALESCE(f.amount_paid,0) > 0 THEN f.amount_paid ELSE f.amount END, schedule_protected=true, updated_at=now()
FROM public.students s WHERE s.id=f.student_id AND s.status='dropped'
  AND f.status NOT IN ('paid','cancelled','waived') AND f.amount > COALESCE(f.amount_paid,0);