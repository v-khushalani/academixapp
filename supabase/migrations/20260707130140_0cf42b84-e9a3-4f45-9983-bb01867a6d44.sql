
DROP FUNCTION IF EXISTS public.get_student_by_token(text);

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
  onboarding_completed_at timestamptz,
  father_name text,
  father_phone text,
  mother_name text,
  mother_phone text,
  dob date,
  program text,
  stream text,
  preferred_contact text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.full_name, s.phone, s.email, s.class, s.school,
         s.parent_name, s.parent_phone, s.address, s.admission_no,
         s.onboarding_completed_at,
         s.father_name, s.father_phone, s.mother_name, s.mother_phone,
         s.dob, s.program, s.stream, s.preferred_contact
  FROM public.students s
  WHERE s.onboarding_token = _token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_student_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_by_token(text) TO anon, authenticated;
