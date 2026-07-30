-- 1. institute-aware public admission submission
CREATE OR REPLACE FUNCTION public.submit_admission_application(
  _full_name text, _phone text, _email text, _class text, _dob date, _school text,
  _father_name text, _father_phone text, _mother_name text, _mother_phone text,
  _address text, _program text, _stream text, _photo_path text,
  _preferred_contact text, _intent text, _token_amount numeric,
  _institute_slug text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE sid uuid; adm text; pc text; it text; inst uuid;
BEGIN
  IF _full_name IS NULL OR btrim(_full_name) = '' THEN RAISE EXCEPTION 'Full name is required'; END IF;
  IF _phone IS NULL OR btrim(_phone) = '' THEN RAISE EXCEPTION 'Phone is required'; END IF;
  IF _father_name IS NULL OR btrim(_father_name) = '' THEN RAISE EXCEPTION 'Father name is required'; END IF;
  IF _father_phone IS NULL OR btrim(_father_phone) = '' THEN RAISE EXCEPTION 'Father phone is required'; END IF;
  IF _mother_name IS NULL OR btrim(_mother_name) = '' THEN RAISE EXCEPTION 'Mother name is required'; END IF;
  IF _mother_phone IS NULL OR btrim(_mother_phone) = '' THEN RAISE EXCEPTION 'Mother phone is required'; END IF;

  IF _institute_slug IS NOT NULL AND btrim(_institute_slug) <> '' THEN
    SELECT id INTO inst FROM public.institutes WHERE slug = btrim(_institute_slug) LIMIT 1;
  END IF;
  IF inst IS NULL THEN
    SELECT i.id INTO inst
    FROM public.institutes i
    LEFT JOIN public.user_roles ur ON ur.institute_id = i.id
    GROUP BY i.id, i.created_at
    ORDER BY count(ur.id) DESC, i.created_at
    LIMIT 1;
  END IF;
  IF inst IS NULL THEN RAISE EXCEPTION 'No institute configured'; END IF;

  pc := COALESCE(NULLIF(_preferred_contact,''), 'father');
  IF pc NOT IN ('father','mother') THEN pc := 'father'; END IF;
  it := COALESCE(NULLIF(_intent,''), 'admission');
  IF it NOT IN ('admission','enquiry') THEN it := 'admission'; END IF;
  adm := 'APP-' || to_char(now(), 'YYMMDD') || '-' || substr(md5(random()::text), 1, 4);

  INSERT INTO public.students (
    institute_id, full_name, phone, email, class, dob, school,
    father_name, father_phone, mother_name, mother_phone,
    parent_name, parent_phone, address, program, stream, photo_path,
    admission_no, approval_status, status, preferred_contact, onboarding_completed_at,
    intent, token_amount
  ) VALUES (
    inst, btrim(_full_name), btrim(_phone), NULLIF(btrim(_email),''), NULLIF(btrim(_class),''), _dob, NULLIF(btrim(_school),''),
    btrim(_father_name), btrim(_father_phone),
    btrim(_mother_name), btrim(_mother_phone),
    CASE WHEN pc='mother' THEN btrim(_mother_name) ELSE btrim(_father_name) END,
    CASE WHEN pc='mother' THEN btrim(_mother_phone) ELSE btrim(_father_phone) END,
    NULLIF(btrim(_address),''), NULLIF(_program,''), NULLIF(_stream,''), NULLIF(_photo_path,''),
    adm, CASE WHEN it='enquiry' THEN 'enquiry' ELSE 'pending' END, 'inactive', pc, now(),
    it, GREATEST(0, COALESCE(_token_amount,0))
  ) RETURNING id INTO sid;
  RETURN sid;
END;
$fn$;

-- 2. move stranded applications to the real institute
UPDATE public.students
SET institute_id = '4ca4e0de-aff8-47c2-ad54-855cea5a4571'
WHERE institute_id = 'b9ea1af5-35d2-412d-a2bf-d3a3384d8435'
  AND approval_status IN ('pending','enquiry');

UPDATE public.institutes
SET name = 'Unused (legacy default)', status = 'inactive'
WHERE id = 'b9ea1af5-35d2-412d-a2bf-d3a3384d8435';

-- 3. hot-path indexes
CREATE INDEX IF NOT EXISTS idx_students_inst_approval ON public.students (institute_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_students_batch ON public.students (batch_id);
CREATE INDEX IF NOT EXISTS idx_fees_inst_status ON public.fees (institute_id, status);
CREATE INDEX IF NOT EXISTS idx_fees_student ON public.fees (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_inst_date ON public.attendance (institute_id, date);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_inst_day ON public.timetable_slots (institute_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_day_plan_inst_date ON public.timetable_day_plan (institute_id, date);
CREATE INDEX IF NOT EXISTS idx_leads_inst_stage ON public.leads (institute_id, stage);