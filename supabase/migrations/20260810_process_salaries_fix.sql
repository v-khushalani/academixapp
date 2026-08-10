-- Fix to explicitly revoke public execute and set search path correctly
REVOKE EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) FROM public;
GRANT EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) TO service_role;

ALTER FUNCTION public.process_faculty_salaries(uuid, date) SET search_path = public;
