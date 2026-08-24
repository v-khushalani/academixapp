CREATE OR REPLACE FUNCTION public.batch_faculty_names(_batch_id uuid)
 RETURNS TABLE(id uuid, full_name text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT f.id, f.full_name
  FROM public.timetable_slots ts
  JOIN public.faculty f ON f.id = ts.faculty_id
  WHERE ts.batch_id = _batch_id
    AND (
      public.is_superadmin()
      OR ts.batch_id IN (SELECT public.my_batch_ids())
      OR ts.institute_id IN (SELECT public.my_institute_ids())
    );
$function$;

REVOKE ALL ON FUNCTION public.batch_faculty_names(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.batch_faculty_names(uuid) TO authenticated, service_role;