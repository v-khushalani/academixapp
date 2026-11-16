ALTER TABLE public.fees ADD COLUMN schedule_protected boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.protect_adjusted_fee_schedule() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 UPDATE public.fees SET schedule_protected=true WHERE student_id=NEW.student_id AND institute_id=NEW.institute_id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_adjusted_fee_schedule() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_adjusted_fee_schedule AFTER INSERT ON public.fee_adjustments FOR EACH ROW EXECUTE FUNCTION public.protect_adjusted_fee_schedule();
UPDATE public.fees f SET schedule_protected=true WHERE EXISTS (SELECT 1 FROM public.fee_adjustments a WHERE a.student_id=f.student_id AND a.institute_id=f.institute_id);
DO $$ DECLARE body text; BEGIN
 body:=pg_get_functiondef('public.sync_student_batch_fee(uuid)'::regprocedure);
 IF position('BEGIN' in body)=0 THEN RAISE EXCEPTION 'Unexpected fee generation definition'; END IF;
 body:=overlay(body placing E'BEGIN\n IF EXISTS (SELECT 1 FROM public.fees WHERE student_id=_student_id AND schedule_protected) THEN RETURN; END IF;\n' from position('BEGIN' in body) for 5);
 EXECUTE body;
END $$;
CREATE OR REPLACE FUNCTION public.skip_zero_generated_fee() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NEW.amount=0 AND COALESCE(NEW.amount_paid,0)=0 AND NEW.status='pending' AND NEW.batch_id IS NOT NULL THEN RETURN NULL; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.skip_zero_generated_fee() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER skip_zero_generated_fee BEFORE INSERT ON public.fees FOR EACH ROW EXECUTE FUNCTION public.skip_zero_generated_fee();