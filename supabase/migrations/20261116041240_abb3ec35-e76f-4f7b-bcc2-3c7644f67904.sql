DO $$ DECLARE f public.fees%ROWTYPE; actor uuid; test_fee uuid; req uuid:=gen_random_uuid(); result jsonb; BEGIN
 SELECT fees.* INTO f FROM public.fees fees JOIN public.user_roles ur ON ur.institute_id=fees.institute_id AND ur.role='accountant' LIMIT 1;
 IF NOT FOUND THEN RAISE NOTICE 'Accountant fixture unavailable; live accountant verification remains pending'; RETURN; END IF;
 SELECT user_id INTO actor FROM public.user_roles WHERE institute_id=f.institute_id AND role='accountant' LIMIT 1;
 BEGIN
  INSERT INTO public.fees(student_id,batch_id,institute_id,amount,amount_paid,status,description,installment_no,installment_of) VALUES(f.student_id,NULL,f.institute_id,9000,0,'pending','Rollback accountant regression',999,999) RETURNING id INTO test_fee;
  result:=public.collect_fee_payment_atomic_server(actor,req,test_fee,6000,'Cash',true);
  IF (result->>'amount_paid')::numeric<>6000 OR (result->>'amount')::numeric<>6000 THEN RAISE EXCEPTION 'Incorrect partial receipt'; END IF;
  result:=public.collect_fee_payment_atomic_server(actor,req,test_fee,6000,'Cash',true);
  IF (SELECT amount_paid FROM public.fees WHERE id=test_fee)<>6000 THEN RAISE EXCEPTION 'Duplicate collection'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.fee_adjustments WHERE fee_id=test_fee AND amount=3000) THEN RAISE EXCEPTION 'Missing balance carry-forward'; END IF;
  RAISE EXCEPTION SQLSTATE 'ZX001' USING MESSAGE='rollback successful accountant fixture';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
 END;
END $$;