DROP FUNCTION IF EXISTS public.readmit_student(uuid);

CREATE OR REPLACE FUNCTION public.student_waived_on_exit(_student_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE inst uuid; v numeric;
BEGIN
  SELECT institute_id INTO inst FROM public.students WHERE id=_student_id;
  IF inst IS NULL THEN RETURN 0; END IF;
  IF NOT (public.is_superadmin() OR public.role_in_institute(inst, ARRAY['owner','admin','receptionist','accountant']::app_role[])) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  SELECT COALESCE(SUM(CASE WHEN reason LIKE 'Waived on exit%' THEN amount WHEN reason LIKE 'Restored on re-admission%' THEN -amount ELSE 0 END),0)
    INTO v FROM public.fee_adjustments WHERE student_id=_student_id AND institute_id=inst AND kind='revision';
  RETURN GREATEST(v,0);
END; $$;

CREATE OR REPLACE FUNCTION public.readmit_student(_student_id uuid, _restore_fees boolean DEFAULT false, _new_due_date date DEFAULT NULL, _custom_amount numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE inst uuid; budget numeric; restored numeric := 0; r record; take numeric; due date;
BEGIN
  SELECT institute_id INTO inst FROM public.students WHERE id=_student_id FOR UPDATE;
  IF inst IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  IF NOT (public.is_superadmin() OR public.role_in_institute(inst, ARRAY['owner','admin','receptionist']::app_role[])) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  due := COALESCE(_new_due_date, CURRENT_DATE);
  IF _custom_amount IS NOT NULL AND _custom_amount < 0 THEN RAISE EXCEPTION 'Amount cannot be negative'; END IF;

  IF _restore_fees OR COALESCE(_custom_amount,0) > 0 THEN
    budget := COALESCE(_custom_amount, 1e15);
    IF _custom_amount IS NOT NULL AND _custom_amount > public.student_waived_on_exit(_student_id) THEN
      RAISE EXCEPTION 'Amount exceeds the waived balance';
    END IF;
    PERFORM 1 FROM public.fees WHERE student_id=_student_id AND institute_id=inst FOR UPDATE;
    FOR r IN
      SELECT f.id, f.amount, COALESCE(f.amount_paid,0) AS paid, f.status,
        SUM(CASE WHEN a.reason LIKE 'Waived on exit%' THEN a.amount ELSE -a.amount END) AS open_w
      FROM public.fees f JOIN public.fee_adjustments a ON a.fee_id=f.id AND a.kind='revision'
        AND (a.reason LIKE 'Waived on exit%' OR a.reason LIKE 'Restored on re-admission%')
      WHERE f.student_id=_student_id AND f.institute_id=inst
      GROUP BY f.id ORDER BY f.installment_no, f.due_date NULLS LAST
    LOOP
      EXIT WHEN budget <= 0;
      CONTINUE WHEN r.open_w <= 0;
      take := LEAST(r.open_w, budget);
      budget := budget - take; restored := restored + take;
      IF r.status = 'waived' THEN
        UPDATE public.fees SET amount = take + r.paid, status = CASE WHEN r.paid > 0 THEN 'partial'::fee_status ELSE 'pending'::fee_status END,
          due_date = due, schedule_protected = true, updated_at = now() WHERE id = r.id;
      ELSE
        UPDATE public.fees SET amount = amount + take, status = 'partial', due_date = due, paid_date = NULL,
          schedule_protected = true, updated_at = now() WHERE id = r.id;
      END IF;
      INSERT INTO public.fee_adjustments (institute_id, fee_id, student_id, kind, amount, reason, created_by)
      VALUES (inst, r.id, _student_id, 'revision', take, 'Restored on re-admission', auth.uid());
    END LOOP;
  END IF;

  UPDATE public.students SET status='active',
    notes = trim(both E'\n' from COALESCE(notes,'') || E'\nRe-admitted ' || to_char(CURRENT_DATE,'DD Mon YYYY')
      || CASE WHEN restored > 0 THEN ' (dues restored ₹' || restored::text || ')' ELSE '' END), updated_at=now()
   WHERE id=_student_id;
  RETURN jsonb_build_object('restored', restored);
END; $$;

REVOKE ALL ON FUNCTION public.readmit_student(uuid,boolean,date,numeric) FROM public, anon;
REVOKE ALL ON FUNCTION public.student_waived_on_exit(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.readmit_student(uuid,boolean,date,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_waived_on_exit(uuid) TO authenticated;