DROP FUNCTION IF EXISTS public.submit_admission_application(text,text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,numeric,text);

CREATE OR REPLACE FUNCTION public.submit_admission_application(_full_name text, _phone text, _email text, _class text, _dob date, _school text, _father_name text, _father_phone text, _mother_name text, _mother_phone text, _address text, _program text, _stream text, _photo_path text, _preferred_contact text, _intent text, _token_amount numeric, _institute_slug text DEFAULT NULL::text, _aadhaar_last4 text DEFAULT NULL::text, _aadhaar_hash text DEFAULT NULL::text, _aadhaar_verified boolean DEFAULT false, _aadhaar_edited_fields text[] DEFAULT '{}'::text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF _aadhaar_hash IS NOT NULL AND btrim(_aadhaar_hash) <> '' THEN
    IF EXISTS (SELECT 1 FROM public.students s
                WHERE s.institute_id = inst AND s.aadhaar_hash = btrim(_aadhaar_hash)) THEN
      RAISE EXCEPTION 'An application with this Aadhaar already exists at this institute';
    END IF;
  END IF;

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
    intent, token_amount,
    aadhaar_last4, aadhaar_hash, aadhaar_verified_at, aadhaar_edited_fields
  ) VALUES (
    inst, btrim(_full_name), btrim(_phone), NULLIF(btrim(_email),''), NULLIF(btrim(_class),''), _dob, NULLIF(btrim(_school),''),
    btrim(_father_name), btrim(_father_phone),
    btrim(_mother_name), btrim(_mother_phone),
    CASE WHEN pc='mother' THEN btrim(_mother_name) ELSE btrim(_father_name) END,
    CASE WHEN pc='mother' THEN btrim(_mother_phone) ELSE btrim(_father_phone) END,
    NULLIF(btrim(_address),''), NULLIF(_program,''), NULLIF(_stream,''), NULLIF(_photo_path,''),
    adm, CASE WHEN it='enquiry' THEN 'enquiry' ELSE 'pending' END, 'inactive', pc, now(),
    it, GREATEST(0, COALESCE(_token_amount,0)),
    NULLIF(btrim(COALESCE(_aadhaar_last4,'')),''),
    NULLIF(btrim(COALESCE(_aadhaar_hash,'')),''),
    CASE WHEN COALESCE(_aadhaar_verified,false) THEN now() ELSE NULL END,
    COALESCE(_aadhaar_edited_fields, '{}')
  ) RETURNING id INTO sid;
  RETURN sid;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_admission_application(text,text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,numeric,text,text,text,boolean,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_admission_application(text,text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,numeric,text,text,text,boolean,text[]) TO anon, authenticated;