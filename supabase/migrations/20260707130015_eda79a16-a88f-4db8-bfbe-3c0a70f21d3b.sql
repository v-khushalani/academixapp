
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS preferred_contact text NOT NULL DEFAULT 'father';

ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_preferred_contact_check;
ALTER TABLE public.students ADD CONSTRAINT students_preferred_contact_check
  CHECK (preferred_contact IN ('father','mother'));

DROP FUNCTION IF EXISTS public.submit_admission_application(
  text,text,text,text,date,text,text,text,text,text,text,text,text,text
);

CREATE OR REPLACE FUNCTION public.submit_admission_application(
  _full_name text, _phone text, _email text, _class text, _dob date,
  _school text, _father_name text, _father_phone text,
  _mother_name text, _mother_phone text, _address text,
  _program text, _stream text, _photo_path text,
  _preferred_contact text DEFAULT 'father'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE sid uuid; adm text; pc text;
BEGIN
  IF _full_name IS NULL OR btrim(_full_name) = '' THEN RAISE EXCEPTION 'Full name is required'; END IF;
  IF _phone IS NULL OR btrim(_phone) = '' THEN RAISE EXCEPTION 'Phone is required'; END IF;
  IF _father_name IS NULL OR btrim(_father_name) = '' THEN RAISE EXCEPTION 'Father name is required'; END IF;
  IF _father_phone IS NULL OR btrim(_father_phone) = '' THEN RAISE EXCEPTION 'Father phone is required'; END IF;
  IF _mother_name IS NULL OR btrim(_mother_name) = '' THEN RAISE EXCEPTION 'Mother name is required'; END IF;
  IF _mother_phone IS NULL OR btrim(_mother_phone) = '' THEN RAISE EXCEPTION 'Mother phone is required'; END IF;
  pc := COALESCE(NULLIF(_preferred_contact,''), 'father');
  IF pc NOT IN ('father','mother') THEN pc := 'father'; END IF;
  adm := 'APP-' || to_char(now(), 'YYMMDD') || '-' || substr(md5(random()::text), 1, 4);
  INSERT INTO public.students (
    full_name, phone, email, class, dob, school,
    father_name, father_phone, mother_name, mother_phone,
    parent_name, parent_phone, address, program, stream, photo_path,
    admission_no, approval_status, status, preferred_contact, onboarding_completed_at
  ) VALUES (
    btrim(_full_name), btrim(_phone), NULLIF(btrim(_email),''), NULLIF(btrim(_class),''), _dob, NULLIF(btrim(_school),''),
    btrim(_father_name), btrim(_father_phone),
    btrim(_mother_name), btrim(_mother_phone),
    CASE WHEN pc='mother' THEN btrim(_mother_name) ELSE btrim(_father_name) END,
    CASE WHEN pc='mother' THEN btrim(_mother_phone) ELSE btrim(_father_phone) END,
    NULLIF(btrim(_address),''), NULLIF(_program,''), NULLIF(_stream,''), NULLIF(_photo_path,''),
    adm, 'pending', 'inactive', pc, now()
  ) RETURNING id INTO sid;
  RETURN sid;
END; $$;

GRANT EXECUTE ON FUNCTION public.submit_admission_application(
  text,text,text,text,date,text,text,text,text,text,text,text,text,text,text
) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.complete_student_onboarding(
  text,text,text,text,text,text,text,text,text,date,text,text,text,text,text,text,text
);

CREATE OR REPLACE FUNCTION public.complete_student_onboarding(
  _token text, _full_name text, _phone text, _email text, _class text,
  _school text, _parent_name text, _parent_phone text, _address text,
  _dob date DEFAULT NULL, _father_name text DEFAULT NULL, _father_phone text DEFAULT NULL,
  _mother_name text DEFAULT NULL, _mother_phone text DEFAULT NULL,
  _program text DEFAULT NULL, _stream text DEFAULT NULL, _photo_path text DEFAULT NULL,
  _preferred_contact text DEFAULT 'father'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE pc text;
BEGIN
  IF _token IS NULL OR btrim(_token) = '' THEN RAISE EXCEPTION 'Invalid token'; END IF;
  pc := COALESCE(NULLIF(_preferred_contact,''),'father');
  IF pc NOT IN ('father','mother') THEN pc := 'father'; END IF;
  UPDATE public.students SET
    full_name = COALESCE(NULLIF(btrim(_full_name),''), full_name),
    phone = COALESCE(NULLIF(btrim(_phone),''), phone),
    email = COALESCE(NULLIF(btrim(_email),''), email),
    class = COALESCE(NULLIF(btrim(_class),''), class),
    school = COALESCE(NULLIF(btrim(_school),''), school),
    parent_name = CASE WHEN pc='mother' THEN COALESCE(NULLIF(btrim(_mother_name),''), NULLIF(btrim(_parent_name),''), parent_name)
                       ELSE COALESCE(NULLIF(btrim(_father_name),''), NULLIF(btrim(_parent_name),''), parent_name) END,
    parent_phone = CASE WHEN pc='mother' THEN COALESCE(NULLIF(btrim(_mother_phone),''), NULLIF(btrim(_parent_phone),''), parent_phone)
                        ELSE COALESCE(NULLIF(btrim(_father_phone),''), NULLIF(btrim(_parent_phone),''), parent_phone) END,
    address = COALESCE(NULLIF(btrim(_address),''), address),
    dob = COALESCE(_dob, dob),
    father_name = COALESCE(NULLIF(btrim(_father_name),''), father_name),
    father_phone = COALESCE(NULLIF(btrim(_father_phone),''), father_phone),
    mother_name = COALESCE(NULLIF(btrim(_mother_name),''), mother_name),
    mother_phone = COALESCE(NULLIF(btrim(_mother_phone),''), mother_phone),
    program = COALESCE(NULLIF(_program,''), program),
    stream = COALESCE(NULLIF(_stream,''), stream),
    photo_path = COALESCE(NULLIF(_photo_path,''), photo_path),
    preferred_contact = pc,
    approval_status = 'pending',
    onboarding_completed_at = now(),
    updated_at = now()
  WHERE onboarding_token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired link'; END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.complete_student_onboarding(
  text,text,text,text,text,text,text,text,text,date,text,text,text,text,text,text,text,text
) TO anon, authenticated;
