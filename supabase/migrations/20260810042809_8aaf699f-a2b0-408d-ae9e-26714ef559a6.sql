-- Revoke public execute rights for security hardening
REVOKE EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) FROM public;
GRANT EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) TO service_role;

-- Ensure search path is locked to public
ALTER FUNCTION public.process_faculty_salaries(uuid, date) SET search_path = public;
