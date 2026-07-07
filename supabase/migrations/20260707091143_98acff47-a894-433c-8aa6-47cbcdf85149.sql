
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS father_phone text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS mother_phone text,
  ADD COLUMN IF NOT EXISTS program text,
  ADD COLUMN IF NOT EXISTS stream text,
  ADD COLUMN IF NOT EXISTS photo_path text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_approval_status_check;
ALTER TABLE public.students ADD CONSTRAINT students_approval_status_check
  CHECK (approval_status IN ('pending','approved','rejected'));
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_program_check;
ALTER TABLE public.students ADD CONSTRAINT students_program_check
  CHECK (program IS NULL OR program IN ('schooling','foundation','both'));
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_stream_check;
ALTER TABLE public.students ADD CONSTRAINT students_stream_check
  CHECK (stream IS NULL OR stream IN ('pcm','pcb'));

CREATE OR REPLACE FUNCTION public.submit_admission_application(
  _full_name text, _phone text, _email text, _class text, _dob date,
  _school text, _father_name text, _father_phone text,
  _mother_name text, _mother_phone text, _address text,
  _program text, _stream text, _photo_path text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE sid uuid; adm text;
BEGIN
  IF _full_name IS NULL OR btrim(_full_name) = '' THEN RAISE EXCEPTION 'Full name is required'; END IF;
  IF _phone IS NULL OR btrim(_phone) = '' THEN RAISE EXCEPTION 'Phone is required'; END IF;
  adm := 'APP-' || to_char(now(), 'YYMMDD') || '-' || substr(md5(random()::text), 1, 4);
  INSERT INTO public.students (
    full_name, phone, email, class, dob, school,
    father_name, father_phone, mother_name, mother_phone,
    parent_name, parent_phone, address, program, stream, photo_path,
    admission_no, approval_status, status, onboarding_completed_at
  ) VALUES (
    btrim(_full_name), btrim(_phone), NULLIF(btrim(_email),''), NULLIF(btrim(_class),''), _dob, NULLIF(btrim(_school),''),
    NULLIF(btrim(_father_name),''), NULLIF(btrim(_father_phone),''),
    NULLIF(btrim(_mother_name),''), NULLIF(btrim(_mother_phone),''),
    COALESCE(NULLIF(btrim(_father_name),''), NULLIF(btrim(_mother_name),'')),
    COALESCE(NULLIF(btrim(_father_phone),''), NULLIF(btrim(_mother_phone),'')),
    NULLIF(btrim(_address),''), NULLIF(_program,''), NULLIF(_stream,''), NULLIF(_photo_path,''),
    adm, 'pending', 'inactive', now()
  ) RETURNING id INTO sid;
  RETURN sid;
END; $$;

GRANT EXECUTE ON FUNCTION public.submit_admission_application(
  text,text,text,text,date,text,text,text,text,text,text,text,text,text
) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.complete_student_onboarding(
  _token text, _full_name text, _phone text, _email text, _class text,
  _school text, _parent_name text, _parent_phone text, _address text,
  _dob date DEFAULT NULL, _father_name text DEFAULT NULL, _father_phone text DEFAULT NULL,
  _mother_name text DEFAULT NULL, _mother_phone text DEFAULT NULL,
  _program text DEFAULT NULL, _stream text DEFAULT NULL, _photo_path text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE sid uuid;
BEGIN
  UPDATE public.students
     SET full_name    = COALESCE(NULLIF(_full_name,''), full_name),
         phone        = COALESCE(NULLIF(_phone,''), phone),
         email        = COALESCE(NULLIF(_email,''), email),
         class        = COALESCE(NULLIF(_class,''), class),
         dob          = COALESCE(_dob, dob),
         school       = COALESCE(NULLIF(_school,''), school),
         parent_name  = COALESCE(NULLIF(_parent_name,''), parent_name),
         parent_phone = COALESCE(NULLIF(_parent_phone,''), parent_phone),
         father_name  = COALESCE(NULLIF(_father_name,''), father_name),
         father_phone = COALESCE(NULLIF(_father_phone,''), father_phone),
         mother_name  = COALESCE(NULLIF(_mother_name,''), mother_name),
         mother_phone = COALESCE(NULLIF(_mother_phone,''), mother_phone),
         address      = COALESCE(NULLIF(_address,''), address),
         program      = COALESCE(NULLIF(_program,''), program),
         stream       = COALESCE(NULLIF(_stream,''), stream),
         photo_path   = COALESCE(NULLIF(_photo_path,''), photo_path),
         approval_status = CASE WHEN approval_status = 'approved' THEN approval_status ELSE 'pending' END,
         onboarding_completed_at = now()
   WHERE onboarding_token = _token
   RETURNING id INTO sid;
  IF sid IS NULL THEN RAISE EXCEPTION 'Invalid or expired onboarding link'; END IF;
  RETURN sid;
END; $$;

CREATE OR REPLACE FUNCTION public.set_student_approval(_student_id uuid, _decision text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[]) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF _decision NOT IN ('approved','rejected','pending') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  UPDATE public.students
     SET approval_status = _decision,
         status = CASE WHEN _decision = 'approved' THEN 'active'::student_status ELSE status END
   WHERE id = _student_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.set_student_approval(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "public can upload student photo" ON storage.objects;
CREATE POLICY "public can upload student photo"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'student-photos');

DROP POLICY IF EXISTS "staff can read student photos" ON storage.objects;
CREATE POLICY "staff can read student photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'student-photos'
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist','counsellor','accountant','faculty']::app_role[]));

DROP POLICY IF EXISTS "staff can delete student photos" ON storage.objects;
CREATE POLICY "staff can delete student photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'student-photos'
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[]));
