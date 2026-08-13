-- Revoke default public execute
REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM PUBLIC;
-- Grant specifically to authenticated role
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;
-- Also grant to service_role for admin tools
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO service_role;
