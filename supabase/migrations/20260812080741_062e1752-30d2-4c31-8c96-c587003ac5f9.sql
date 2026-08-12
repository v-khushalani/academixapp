
DO $$
BEGIN
    -- handle_new_user is used by a trigger on auth.users
    -- It needs search_path and execution for service_role
    ALTER FUNCTION public.handle_new_user() SET search_path = public;
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC';
    -- Trigger functions run as owner, but the caller of the trigger is auth
    -- Supabase trigger functions usually allow anon for auth flow
    -- but we can restrict to authenticated/service_role if not needed by anon
    -- However, during signup (handle_new_user), the user is technically not yet authenticated in the profile table
    -- but the trigger runs as superuser/postgres.
    
    -- Public-facing onboarding/invite functions (Anon must call these)
    -- We Revoke and then Re-grant to be explicit, even if it leaves them public
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_student_invite(text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_student_invite(text) TO PUBLIC';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.accept_student_invite(text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.accept_student_invite(text) TO PUBLIC';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_student_by_token(text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_student_by_token(text) TO PUBLIC';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_faculty_invite(text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_faculty_invite(text) TO PUBLIC';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.accept_faculty_invite(text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.accept_faculty_invite(text) TO PUBLIC';

    -- Note: complete_student_onboarding and submit_admission_application have many args
    -- Let's explicitly Revoke and Grant for the onboarding one
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.complete_student_onboarding(text, text, text, text, text, text, text, text, text, date, text, text, text, text, text, text, text, text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.complete_student_onboarding(text, text, text, text, text, text, text, text, text, date, text, text, text, text, text, text, text, text) TO PUBLIC';

    -- mark_attendance_notified should be internal/staff only
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.mark_attendance_notified(uuid[]) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.mark_attendance_notified(uuid[]) TO authenticated, service_role';
END $$;
