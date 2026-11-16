DO $$ DECLARE f public.fees%ROWTYPE; before_count integer; after_count integer; generated uuid; BEGIN
 SELECT * INTO f FROM public.fees WHERE batch_id IS NOT NULL LIMIT 1;
 IF FOUND THEN
  BEGIN
   SELECT count(*) INTO before_count FROM public.fees WHERE student_id=f.student_id;
   INSERT INTO public.fees(student_id,batch_id,institute_id,amount,amount_paid,status,description) VALUES(f.student_id,f.batch_id,f.institute_id,0,0,'pending','Rollback regression zero fee') RETURNING id INTO generated;
   IF generated IS NOT NULL THEN RAISE EXCEPTION 'Zero pending fee was inserted'; END IF;
   UPDATE public.fees SET schedule_protected=true WHERE id=f.id;
   PERFORM public.sync_student_batch_fee(f.student_id);
   SELECT count(*) INTO after_count FROM public.fees WHERE student_id=f.student_id;
   IF before_count<>after_count OR NOT EXISTS(SELECT 1 FROM public.fees WHERE id=f.id AND amount=f.amount AND due_date IS NOT DISTINCT FROM f.due_date) THEN RAISE EXCEPTION 'Protected schedule changed'; END IF;
   RAISE EXCEPTION SQLSTATE 'ZX001' USING MESSAGE='rollback successful fixture';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
 END IF;
 IF has_function_privilege('authenticated','public.collect_fee_payment_atomic_server(uuid,uuid,uuid,numeric,text,boolean)','EXECUTE') OR has_function_privilege('anon','public.collect_fee_payment_atomic_server(uuid,uuid,uuid,numeric,text,boolean)','EXECUTE') THEN RAISE EXCEPTION 'Privileged RPC exposed'; END IF;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.plan_catalog'::regclass AND tgname IN ('plan_catalog_sync_institutes_t','trg_sync_institutes_from_plan_catalog')) THEN RAISE EXCEPTION 'Automatic propagation remains'; END IF;
END $$;