-- Converting remaining non-essential DEFINER functions to INVOKER
ALTER FUNCTION public.set_student_approval(uuid, text) SECURITY INVOKER;
ALTER FUNCTION public.platform_update_institute(uuid, text, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean) SECURITY INVOKER;
ALTER FUNCTION public.platform_update_institute(uuid, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean, text) SECURITY INVOKER;
ALTER FUNCTION public.platform_institutes() SECURITY INVOKER;

-- The linter will still flag onboarding functions (submit_admission_application, complete_student_onboarding) 
-- because they MUST be DEFINER (to create users/profiles) and MUST be public (for guests).
-- This is a "Known Exception" for SaaS onboarding.

-- For accept_student_invite and accept_faculty_invite, we revoke PUBLIC and keep as DEFINER 
-- but only for 'authenticated' users. The linter might still warn, but it is secure.
REVOKE EXECUTE ON FUNCTION public.accept_student_invite(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_faculty_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_student_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_faculty_invite(text) TO authenticated;

-- Ensure search_path is set for the remaining ones
ALTER FUNCTION public.submit_admission_application(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, numeric, text) SET search_path = public;
ALTER FUNCTION public.complete_student_onboarding(text, text, text, text, text, text, text, text, text, date, text, text, text, text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.accept_student_invite(text) SET search_path = public;
ALTER FUNCTION public.accept_faculty_invite(text) SET search_path = public;
