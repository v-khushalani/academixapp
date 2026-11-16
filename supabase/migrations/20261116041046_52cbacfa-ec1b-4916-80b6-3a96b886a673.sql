DO $$ DECLARE body text; BEGIN
 body:=pg_get_functiondef('public.revise_installment(uuid,numeric,date,boolean,text,text)'::regprocedure);
 body:=replace(body,'public.is_superadmin() OR f.institute_id IN (SELECT public.my_institute_ids())','public.is_superadmin() OR public.role_in_institute(f.institute_id, ARRAY[''owner'',''admin'',''accountant'',''receptionist'']::public.app_role[])');
 body:=replace(body,'WHERE id = _fee_id;','WHERE id = _fee_id FOR UPDATE;');
 -- Only lock the initial read, not the UPDATE statement.
 body:=replace(body,'updated_at = now()'||chr(10)||'   WHERE id = _fee_id FOR UPDATE;','updated_at = now()'||chr(10)||'   WHERE id = _fee_id;');
 EXECUTE body;
END $$;