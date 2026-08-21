CREATE OR REPLACE FUNCTION public.platform_institute_detail(_institute_id uuid)
RETURNS TABLE(kind text, id uuid, title text, subtitle text, extra text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'batch', b.id, b.name, COALESCE(b.class_level,''), b.status::text
    FROM public.batches b WHERE public.is_superadmin() AND b.institute_id = _institute_id
  UNION ALL
  SELECT 'faculty', f.id, f.full_name, COALESCE(f.subject,''), f.status
    FROM public.faculty f WHERE public.is_superadmin() AND f.institute_id = _institute_id
  UNION ALL
  SELECT 'student', s.id, s.full_name, COALESCE(s.class,''), s.approval_status
    FROM public.students s WHERE public.is_superadmin() AND s.institute_id = _institute_id
  ORDER BY 1, 3;
$$;

REVOKE EXECUTE ON FUNCTION public.platform_institute_detail(uuid) FROM anon;