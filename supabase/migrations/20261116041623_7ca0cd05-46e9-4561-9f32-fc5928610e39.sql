DO $$ DECLARE p public.plan_catalog%ROWTYPE; before_values jsonb; after_values jsonb; BEGIN
 SELECT * INTO p FROM public.plan_catalog LIMIT 1;
 SELECT jsonb_agg(to_jsonb(i) ORDER BY id) INTO before_values FROM public.institutes i WHERE plan=p.key;
 BEGIN
 UPDATE public.plan_catalog SET student_limit=student_limit+1 WHERE id=p.id;
 SELECT jsonb_agg(to_jsonb(i) ORDER BY id) INTO after_values FROM public.institutes i WHERE plan=p.key;
 IF before_values IS DISTINCT FROM after_values THEN RAISE EXCEPTION 'Catalog edit changed institute agreements'; END IF;
 RAISE EXCEPTION SQLSTATE 'ZX001' USING MESSAGE='rollback catalog fixture';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
 END;
END $$;