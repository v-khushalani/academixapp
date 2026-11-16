CREATE OR REPLACE FUNCTION public.collect_fee_payment_atomic_server(_actor uuid,_request_id uuid,_fee_id uuid,_received numeric,_method text DEFAULT 'Cash',_carry boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF _actor IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',_actor::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',_actor,'role','authenticated')::text,true);
 RETURN public.collect_fee_payment_atomic(_request_id,_fee_id,_received,_method,_carry);
END $$;
REVOKE ALL ON FUNCTION public.collect_fee_payment_atomic_server(uuid,uuid,uuid,numeric,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.collect_fee_payment_atomic_server(uuid,uuid,uuid,numeric,text,boolean) TO service_role;