REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_my_student(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_batch_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_faculty_batch_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_student_approval(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_institute_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.default_institute_id() FROM anon;