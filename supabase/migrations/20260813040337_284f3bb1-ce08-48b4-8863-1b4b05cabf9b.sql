ALTER FUNCTION public.get_my_roles() SECURITY DEFINER;
-- Re-verify grants just in case
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM anon;
