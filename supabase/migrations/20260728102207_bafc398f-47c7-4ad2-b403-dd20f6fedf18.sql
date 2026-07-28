-- 1. remove duplicate trigger
DROP TRIGGER IF EXISTS students_auto_fee ON public.students;

-- 2. application intent + token amount
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS intent text NOT NULL DEFAULT 'admission',
  ADD COLUMN IF NOT EXISTS token_amount numeric NOT NULL DEFAULT 0;

-- 3. fee sync helper
CREATE OR REPLACE FUNCTION public.sync_student_batch_fee(_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s record; b record; net numeric;
BEGIN
  SELECT id, batch_id, scholarship_percent, discount, institute_id INTO s
    FROM public.students WHERE id = _student_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- drop batch fee rows that no longer match the student's batch and have no money on them
  DELETE FROM public.fees f
   WHERE f.student_id = s.id
     AND f.batch_id IS NOT NULL
     AND f.batch_id IS DISTINCT FROM s.batch_id
     AND COALESCE(f.amount_paid,0) <= 0;

  IF s.batch_id IS NULL THEN RETURN; END IF;

  SELECT id, name, default_fee INTO b FROM public.batches WHERE id = s.batch_id;
  IF NOT FOUND THEN RETURN; END IF;

  net := GREATEST(0, COALESCE(b.default_fee,0)
                     - COALESCE(b.default_fee * COALESCE(s.scholarship_percent,0)/100, 0)
                     - COALESCE(s.discount,0));

  UPDATE public.fees
     SET amount = net,
         description = 'Batch fees: ' || b.name,
         status = CASE WHEN status = 'waived' THEN status
                       WHEN COALESCE(amount_paid,0) <= 0 THEN 'pending'::fee_status
                       WHEN COALESCE(amount_paid,0) >= net THEN 'paid'::fee_status
                       ELSE 'partial'::fee_status END
   WHERE student_id = s.id AND batch_id = s.batch_id;

  IF NOT FOUND AND COALESCE(b.default_fee,0) > 0 THEN
    INSERT INTO public.fees (student_id, batch_id, amount, amount_paid, status, description, institute_id)
    VALUES (s.id, s.batch_id, net, 0, 'pending', 'Batch fees: ' || b.name, s.institute_id)
    ON CONFLICT (student_id, batch_id) WHERE batch_id IS NOT NULL DO NOTHING;
  END IF;
END; $$;

-- 4. student trigger: single entry point
CREATE OR REPLACE FUNCTION public.auto_assign_batch_fee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.batch_id IS NOT DISTINCT FROM OLD.batch_id
     AND NEW.scholarship_percent IS NOT DISTINCT FROM OLD.scholarship_percent
     AND NEW.discount IS NOT DISTINCT FROM OLD.discount THEN
    RETURN NEW;
  END IF;
  PERFORM public.sync_student_batch_fee(NEW.id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_students_recalc_fee ON public.students;
DROP TRIGGER IF EXISTS trg_students_auto_batch_fee ON public.students;
CREATE TRIGGER trg_students_auto_batch_fee
AFTER INSERT OR UPDATE OF batch_id, scholarship_percent, discount ON public.students
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_batch_fee();

-- 5. batch fee change -> resync every student in the batch
CREATE OR REPLACE FUNCTION public.recalc_fees_on_batch_fee_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE s record;
BEGIN
  IF NEW.default_fee IS NOT DISTINCT FROM OLD.default_fee AND NEW.name IS NOT DISTINCT FROM OLD.name THEN
    RETURN NEW;
  END IF;
  FOR s IN SELECT id FROM public.students WHERE batch_id = NEW.id LOOP
    PERFORM public.sync_student_batch_fee(s.id);
  END LOOP;
  RETURN NEW;
END; $$;

-- 6. public application submission with intent + token amount
CREATE OR REPLACE FUNCTION public.submit_admission_application(
  _full_name text, _phone text, _email text, _class text, _dob date, _school text,
  _father_name text, _father_phone text, _mother_name text, _mother_phone text,
  _address text, _program text, _stream text, _photo_path text,
  _preferred_contact text DEFAULT 'father'::text,
  _intent text DEFAULT 'admission'::text,
  _token_amount numeric DEFAULT 0)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE sid uuid; adm text; pc text; it text;
BEGIN
  IF _full_name IS NULL OR btrim(_full_name) = '' THEN RAISE EXCEPTION 'Full name is required'; END IF;
  IF _phone IS NULL OR btrim(_phone) = '' THEN RAISE EXCEPTION 'Phone is required'; END IF;
  IF _father_name IS NULL OR btrim(_father_name) = '' THEN RAISE EXCEPTION 'Father name is required'; END IF;
  IF _father_phone IS NULL OR btrim(_father_phone) = '' THEN RAISE EXCEPTION 'Father phone is required'; END IF;
  IF _mother_name IS NULL OR btrim(_mother_name) = '' THEN RAISE EXCEPTION 'Mother name is required'; END IF;
  IF _mother_phone IS NULL OR btrim(_mother_phone) = '' THEN RAISE EXCEPTION 'Mother phone is required'; END IF;
  pc := COALESCE(NULLIF(_preferred_contact,''), 'father');
  IF pc NOT IN ('father','mother') THEN pc := 'father'; END IF;
  it := COALESCE(NULLIF(_intent,''), 'admission');
  IF it NOT IN ('admission','enquiry') THEN it := 'admission'; END IF;
  adm := 'APP-' || to_char(now(), 'YYMMDD') || '-' || substr(md5(random()::text), 1, 4);
  INSERT INTO public.students (
    full_name, phone, email, class, dob, school,
    father_name, father_phone, mother_name, mother_phone,
    parent_name, parent_phone, address, program, stream, photo_path,
    admission_no, approval_status, status, preferred_contact, onboarding_completed_at,
    intent, token_amount
  ) VALUES (
    btrim(_full_name), btrim(_phone), NULLIF(btrim(_email),''), NULLIF(btrim(_class),''), _dob, NULLIF(btrim(_school),''),
    btrim(_father_name), btrim(_father_phone),
    btrim(_mother_name), btrim(_mother_phone),
    CASE WHEN pc='mother' THEN btrim(_mother_name) ELSE btrim(_father_name) END,
    CASE WHEN pc='mother' THEN btrim(_mother_phone) ELSE btrim(_father_phone) END,
    NULLIF(btrim(_address),''), NULLIF(_program,''), NULLIF(_stream,''), NULLIF(_photo_path,''),
    adm, CASE WHEN it='enquiry' THEN 'enquiry' ELSE 'pending' END, 'inactive', pc, now(),
    it, GREATEST(0, COALESCE(_token_amount,0))
  ) RETURNING id INTO sid;
  RETURN sid;
END; $$;

-- 7. approve an applicant with a batch, record token payment
CREATE OR REPLACE FUNCTION public.approve_admission(_student_id uuid, _batch_id uuid, _token_amount numeric DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE tok numeric; fee_row record;
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[]) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  UPDATE public.students
     SET approval_status = 'approved',
         status = 'active'::student_status,
         intent = 'admission',
         batch_id = COALESCE(_batch_id, batch_id),
         admission_date = COALESCE(admission_date, CURRENT_DATE),
         token_amount = COALESCE(_token_amount, token_amount)
   WHERE id = _student_id
   RETURNING token_amount INTO tok;

  IF tok IS NULL THEN RAISE EXCEPTION 'Applicant not found'; END IF;

  PERFORM public.sync_student_batch_fee(_student_id);

  IF COALESCE(tok,0) > 0 THEN
    SELECT * INTO fee_row FROM public.fees
     WHERE student_id = _student_id AND batch_id = (SELECT batch_id FROM public.students WHERE id = _student_id)
     LIMIT 1;
    IF FOUND AND COALESCE(fee_row.amount_paid,0) <= 0 THEN
      UPDATE public.fees
         SET amount_paid = LEAST(tok, amount),
             paid_date = CURRENT_DATE,
             receipt_no = COALESCE(receipt_no, 'RCP-' || to_char(now(),'YYMMDD') || '-' || substr(md5(random()::text),1,4)),
             status = CASE WHEN LEAST(tok, amount) >= amount THEN 'paid'::fee_status ELSE 'partial'::fee_status END
       WHERE id = fee_row.id;
    END IF;
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.approve_admission(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_admission_application(text,text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,numeric) TO anon, authenticated;