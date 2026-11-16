-- Rollback-only database regression; run through the migration tool.
DO $$
DECLARE f public.fees%ROWTYPE; n integer; generated uuid;
BEGIN
 SELECT * INTO f FROM public.fees WHERE batch_id IS NOT NULL LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'A batch fee fixture is required'; END IF;
 BEGIN
  SELECT count(*) INTO n FROM public.fees WHERE student_id=f.student_id;
  INSERT INTO public.fees(student_id,batch_id,institute_id,amount,amount_paid,status)
  VALUES(f.student_id,f.batch_id,f.institute_id,0,0,'pending') RETURNING id INTO generated;
  IF generated IS NOT NULL THEN RAISE EXCEPTION 'Zero pending bill inserted'; END IF;
  UPDATE public.fees SET schedule_protected=true WHERE id=f.id;
  PERFORM public.sync_student_batch_fee(f.student_id);
  IF n<>(SELECT count(*) FROM public.fees WHERE student_id=f.student_id)
    OR NOT EXISTS(SELECT 1 FROM public.fees WHERE id=f.id AND amount=f.amount AND due_date IS NOT DISTINCT FROM f.due_date)
  THEN RAISE EXCEPTION 'Protected schedule changed'; END IF;
  RAISE EXCEPTION SQLSTATE 'ZX001' USING MESSAGE='rollback fixture';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
 END;
 IF has_function_privilege('authenticated','public.collect_fee_payment_atomic_server(uuid,uuid,uuid,numeric,text,boolean)','EXECUTE')
 THEN RAISE EXCEPTION 'Payment helper exposed'; END IF;
END $$;