REVOKE EXECUTE ON FUNCTION public.is_my_student(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.my_batch_ids() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.my_faculty_batch_ids() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_my_student(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_batch_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_faculty_batch_ids() TO authenticated, service_role;