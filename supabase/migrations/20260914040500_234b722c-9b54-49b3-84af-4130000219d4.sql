-- 1. Stop role rows silently defaulting into the oldest institute (the data leak).
ALTER TABLE public.user_roles ALTER COLUMN institute_id DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.user_roles_require_institute()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.institute_id IS NULL AND NEW.role <> 'superadmin'::app_role THEN
    RAISE EXCEPTION 'A role must name the institute it belongs to';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_require_institute ON public.user_roles;
CREATE TRIGGER user_roles_require_institute
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.user_roles_require_institute();

-- 2. New Google sign-ins never inherit an existing institute.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  inst_name text;
  inst uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );

  inst_name := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'institute_name','')), '');

  IF inst_name IS NOT NULL THEN
    INSERT INTO public.institutes (name, slug, academic_year)
    VALUES (
      inst_name,
      regexp_replace(lower(inst_name), '[^a-z0-9]+', '-', 'g') || '-' || substr(md5(NEW.id::text), 1, 5),
      to_char(now(),'YYYY') || '-' || to_char(now() + interval '1 year','YY')
    )
    RETURNING id INTO inst;
    INSERT INTO public.user_roles (user_id, role, institute_id)
    VALUES (NEW.id, 'owner', inst), (NEW.id, 'admin', inst);
  END IF;

  RETURN NEW;
END; $$;

-- 3. Institute details are editable only by an owner/admin of that same institute.
DROP POLICY IF EXISTS "Owner/admin can update their institute" ON public.institutes;
CREATE POLICY "Owner/admin can update their institute"
ON public.institutes FOR UPDATE TO authenticated
USING (public.role_in_institute(id, ARRAY['owner','admin']::app_role[]))
WITH CHECK (public.role_in_institute(id, ARRAY['owner','admin']::app_role[]));

-- 4. Super admin: list every login on the platform.
CREATE OR REPLACE FUNCTION public.platform_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  roles text[],
  institutes text[],
  student_names text[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT u.id,
         u.email::text,
         p.full_name,
         u.created_at,
         u.last_sign_in_at,
         COALESCE((SELECT array_agg(DISTINCT r.role::text) FROM public.user_roles r WHERE r.user_id = u.id), '{}'::text[]),
         COALESCE((SELECT array_agg(DISTINCT i.name) FROM public.user_roles r JOIN public.institutes i ON i.id = r.institute_id WHERE r.user_id = u.id), '{}'::text[]),
         COALESCE((SELECT array_agg(DISTINCT s.full_name) FROM public.students s WHERE s.user_id = u.id), '{}'::text[])
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.is_superadmin()
  ORDER BY u.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.platform_users() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_users() TO authenticated;

-- 5. Super admin: completely erase a login.
CREATE OR REPLACE FUNCTION public.platform_delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  inst uuid;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot erase your own account';
  END IF;

  -- Unlink so the person can join again from a fresh invite link.
  UPDATE public.students SET user_id = NULL WHERE user_id = _user_id;
  UPDATE public.faculty SET user_id = NULL WHERE user_id = _user_id;
  UPDATE public.student_invites SET used_at = NULL, claimed_by = NULL WHERE claimed_by = _user_id;
  DELETE FROM public.parent_students WHERE parent_user_id = _user_id;

  -- Institutes this login owned alone and that hold no records get removed too.
  FOR inst IN
    SELECT DISTINCT r.institute_id FROM public.user_roles r
     WHERE r.user_id = _user_id AND r.role = 'owner'::app_role AND r.institute_id IS NOT NULL
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.user_roles r2 WHERE r2.institute_id = inst AND r2.user_id <> _user_id)
       AND NOT EXISTS (SELECT 1 FROM public.students s WHERE s.institute_id = inst)
       AND NOT EXISTS (SELECT 1 FROM public.batches b WHERE b.institute_id = inst)
       AND NOT EXISTS (SELECT 1 FROM public.faculty f WHERE f.institute_id = inst)
    THEN
      DELETE FROM public.user_roles WHERE institute_id = inst;
      UPDATE public.profiles SET active_institute_id = NULL WHERE active_institute_id = inst;
      DELETE FROM public.rooms WHERE institute_id = inst;
      DELETE FROM public.plan_change_log WHERE institute_id = inst;
      DELETE FROM public.institutes WHERE id = inst;
    END IF;
  END LOOP;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_delete_user(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.platform_delete_user(uuid) TO authenticated;
