CREATE OR REPLACE FUNCTION public.get_student_invite(_token text)
RETURNS TABLE(student_name text, institute_name text, kind text, valid boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT s.full_name, inst.name, i.kind,
         (i.used_at IS NULL AND i.expires_at > now())
  FROM public.student_invites i
  JOIN public.students s ON s.id = i.student_id
  JOIN public.institutes inst ON inst.id = i.institute_id
  WHERE i.token = _token;
$function$;

GRANT EXECUTE ON FUNCTION public.get_student_invite(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_faculty_invite(_token text)
RETURNS TABLE(full_name text, subject text, institute_name text, valid boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT i.full_name,
         i.subject,
         inst.name,
         (i.used_at IS NULL AND i.expires_at > now())
  FROM public.faculty_invites i
  JOIN public.institutes inst ON inst.id = i.institute_id
  WHERE i.token = _token;
$function$;

GRANT EXECUTE ON FUNCTION public.get_faculty_invite(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_student_invite(_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv public.student_invites%ROWTYPE;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in first';
  END IF;

  SELECT * INTO inv FROM public.student_invites
  WHERE token = _token AND used_at IS NULL AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This link is invalid or has expired';
  END IF;

  IF inv.kind = 'parent' THEN
    INSERT INTO public.user_roles (user_id, role, institute_id)
    VALUES (uid, 'parent'::app_role, inv.institute_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.parent_students (parent_user_id, student_id, relation, institute_id)
    VALUES (uid, inv.student_id, COALESCE(inv.relation, 'parent'), inv.institute_id)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role, institute_id)
    VALUES (uid, 'student'::app_role, inv.institute_id)
    ON CONFLICT DO NOTHING;

    UPDATE public.students SET user_id = uid WHERE id = inv.student_id;
  END IF;

  UPDATE public.student_invites
     SET used_at = now(), claimed_by = uid
   WHERE id = inv.id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.accept_student_invite(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_faculty_invite(_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv public.faculty_invites%ROWTYPE;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in first';
  END IF;

  SELECT * INTO inv FROM public.faculty_invites
  WHERE token = _token AND used_at IS NULL AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invite link is invalid or has expired';
  END IF;

  INSERT INTO public.user_roles (user_id, role, institute_id)
  VALUES (uid, 'faculty'::app_role, inv.institute_id)
  ON CONFLICT DO NOTHING;

  IF inv.faculty_id IS NOT NULL THEN
    UPDATE public.faculty SET user_id = uid WHERE id = inv.faculty_id;
  ELSE
    INSERT INTO public.faculty (full_name, phone, subject, status, institute_id, user_id)
    VALUES (inv.full_name, inv.phone, inv.subject, 'active', inv.institute_id, uid);
  END IF;

  UPDATE public.faculty_invites SET used_at = now() WHERE id = inv.id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.accept_faculty_invite(text) TO authenticated;