DROP VIEW IF EXISTS public.faculty_directory;

CREATE OR REPLACE FUNCTION public.faculty_directory()
RETURNS TABLE (
  id uuid,
  institute_id uuid,
  user_id uuid,
  full_name text,
  email text,
  phone text,
  subject text,
  qualification text,
  joining_date date,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.institute_id, f.user_id, f.full_name, f.email, f.phone,
         f.subject, f.qualification, f.joining_date, f.status
  FROM public.faculty f
  WHERE (
    public.is_superadmin()
    OR (
      f.institute_id IN (SELECT public.my_institute_ids())
      AND public.has_any_role((SELECT auth.uid()), ARRAY['owner','admin','accountant','faculty','receptionist','counsellor']::app_role[])
    )
  )
  ORDER BY f.full_name;
$$;

REVOKE ALL ON FUNCTION public.faculty_directory() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.faculty_directory() FROM anon;
GRANT EXECUTE ON FUNCTION public.faculty_directory() TO authenticated;