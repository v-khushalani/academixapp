
-- 1) Onboarding token columns
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS onboarding_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- 2) Public RPC: look up a student by onboarding token (limited fields)
CREATE OR REPLACE FUNCTION public.get_student_by_token(_token text)
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  email text,
  class text,
  school text,
  parent_name text,
  parent_phone text,
  address text,
  admission_no text,
  onboarding_completed_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.full_name, s.phone, s.email, s.class, s.school,
         s.parent_name, s.parent_phone, s.address, s.admission_no,
         s.onboarding_completed_at
  FROM public.students s
  WHERE s.onboarding_token = _token
  LIMIT 1;
$$;

-- 3) Public RPC: complete onboarding via token
CREATE OR REPLACE FUNCTION public.complete_student_onboarding(
  _token text,
  _full_name text,
  _phone text,
  _email text,
  _class text,
  _school text,
  _parent_name text,
  _parent_phone text,
  _address text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE sid uuid;
BEGIN
  UPDATE public.students
     SET full_name    = COALESCE(NULLIF(_full_name,''), full_name),
         phone        = COALESCE(NULLIF(_phone,''), phone),
         email        = COALESCE(NULLIF(_email,''), email),
         class        = COALESCE(NULLIF(_class,''), class),
         school       = COALESCE(NULLIF(_school,''), school),
         parent_name  = COALESCE(NULLIF(_parent_name,''), parent_name),
         parent_phone = COALESCE(NULLIF(_parent_phone,''), parent_phone),
         address      = COALESCE(NULLIF(_address,''), address),
         onboarding_completed_at = now()
   WHERE onboarding_token = _token
   RETURNING id INTO sid;
  IF sid IS NULL THEN
     RAISE EXCEPTION 'Invalid or expired onboarding link';
  END IF;
  RETURN sid;
END; $$;

REVOKE ALL ON FUNCTION public.get_student_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_student_onboarding(text,text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_student_onboarding(text,text,text,text,text,text,text,text,text) TO anon, authenticated;

-- 4) Recalc all student fees when a batch's default_fee changes
CREATE OR REPLACE FUNCTION public.recalc_fees_on_batch_fee_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  net numeric;
BEGIN
  IF NEW.default_fee IS NOT DISTINCT FROM OLD.default_fee THEN
    RETURN NEW;
  END IF;
  FOR s IN SELECT id, scholarship_percent, discount FROM public.students WHERE batch_id = NEW.id LOOP
    net := GREATEST(0, COALESCE(NEW.default_fee,0)
                       - COALESCE(NEW.default_fee * s.scholarship_percent/100, 0)
                       - COALESCE(s.discount, 0));
    -- upsert-like: try update, else insert
    UPDATE public.fees
       SET amount = net,
           status = CASE WHEN amount_paid <= 0 THEN 'pending'::fee_status
                         WHEN amount_paid >= net THEN 'paid'::fee_status
                         ELSE 'partial'::fee_status END,
           description = 'Batch fees: ' || NEW.name
     WHERE student_id = s.id AND batch_id = NEW.id;
    IF NOT FOUND AND net > 0 THEN
      INSERT INTO public.fees (student_id, batch_id, amount, amount_paid, status, description)
      VALUES (s.id, NEW.id, net, 0, 'pending', 'Batch fees: ' || NEW.name);
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_batches_recalc_fees ON public.batches;
CREATE TRIGGER trg_batches_recalc_fees
AFTER UPDATE OF default_fee ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.recalc_fees_on_batch_fee_change();
