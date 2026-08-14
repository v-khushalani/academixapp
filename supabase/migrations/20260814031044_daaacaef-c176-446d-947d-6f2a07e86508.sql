-- Migration to fix function grants for the Academix ERP
-- Ensures that the UI can call the necessary RPC functions

-- Grant execute on core security and platform functions
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_institutes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_institute_with_owner(text, text) TO authenticated;

-- Grant execute on guest-facing functions
GRANT EXECUTE ON FUNCTION public.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) TO anon, authenticated;
