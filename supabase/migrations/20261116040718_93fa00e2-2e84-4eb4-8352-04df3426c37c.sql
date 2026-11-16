CREATE TABLE public.fee_collection_requests (request_id uuid PRIMARY KEY, institute_id uuid NOT NULL, fee_id uuid NOT NULL, received numeric NOT NULL, method text, carry boolean NOT NULL, actor uuid NOT NULL, result jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.fee_collection_requests TO service_role;
ALTER TABLE public.fee_collection_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER fee_collection_requests_updated BEFORE UPDATE ON public.fee_collection_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.collect_fee_payment_atomic(_request_id uuid,_fee_id uuid,_received numeric,_method text DEFAULT 'Cash',_carry boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.fees%ROWTYPE; r public.fee_collection_requests%ROWTYPE; output jsonb;
BEGIN
 SELECT * INTO f FROM public.fees WHERE id=_fee_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Fee not found'; END IF;
 IF auth.uid() IS NULL OR NOT (public.is_superadmin() OR public.role_in_institute(f.institute_id, ARRAY['owner','admin','accountant','receptionist']::public.app_role[])) THEN RAISE EXCEPTION 'Not allowed'; END IF;
 IF _request_id IS NULL OR _received IS NULL OR _received<=0 THEN RAISE EXCEPTION 'Invalid payment'; END IF;
 INSERT INTO public.fee_collection_requests(request_id,institute_id,fee_id,received,method,carry,actor) VALUES(_request_id,f.institute_id,_fee_id,_received,_method,_carry,auth.uid()) ON CONFLICT DO NOTHING;
 SELECT * INTO r FROM public.fee_collection_requests WHERE request_id=_request_id FOR UPDATE;
 IF r.fee_id<>_fee_id OR r.institute_id<>f.institute_id OR r.actor<>auth.uid() OR r.received<>_received OR r.method IS DISTINCT FROM _method OR r.carry IS DISTINCT FROM _carry THEN RAISE EXCEPTION 'Payment request already used with different details'; END IF;
 IF r.result IS NOT NULL THEN RETURN r.result; END IF;
 PERFORM public.collect_fee_payment(_fee_id,_received,_method,NULL);
 IF _carry AND f.amount-COALESCE(f.amount_paid,0)>_received THEN PERFORM public._settle_partial_fee_core(_fee_id); END IF;
 SELECT jsonb_build_object('fee_id',id,'amount',amount,'amount_paid',amount_paid,'receipt_no',receipt_no,'paid_date',paid_date,'received',_received,'carried',_carry AND f.amount-COALESCE(f.amount_paid,0)>_received) INTO output FROM public.fees WHERE id=_fee_id;
 UPDATE public.fee_collection_requests SET result=output WHERE request_id=_request_id;
 RETURN output;
END $$;
REVOKE ALL ON FUNCTION public.collect_fee_payment_atomic(uuid,uuid,numeric,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.collect_fee_payment_atomic(uuid,uuid,numeric,text,boolean) TO authenticated,service_role;