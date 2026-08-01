CREATE TABLE public.faculty_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  faculty_id uuid REFERENCES public.faculty(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text,
  subject text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  used_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_invites TO authenticated;
GRANT ALL ON public.faculty_invites TO service_role;

ALTER TABLE public.faculty_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage invites of their institute"
ON public.faculty_invites FOR ALL TO authenticated
USING (
  public.is_superadmin()
  OR (institute_id = public.current_institute_id()
      AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[]))
)
WITH CHECK (
  public.is_superadmin()
  OR (institute_id = public.current_institute_id()
      AND public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::app_role[]))
);

CREATE TRIGGER faculty_invites_set_updated_at
BEFORE UPDATE ON public.faculty_invites
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_faculty_invites_institute ON public.faculty_invites(institute_id);

-- Public: read the minimal details behind an invite link (no auth needed to show the page)
CREATE OR REPLACE FUNCTION public.get_faculty_invite(_token text)
RETURNS TABLE (full_name text, subject text, institute_name text, valid boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.full_name,
         i.subject,
         inst.name,
         (i.used_at IS NULL AND i.expires_at > now())
  FROM public.faculty_invites i
  JOIN public.institutes inst ON inst.id = i.institute_id
  WHERE i.token = _token;
$$;

GRANT EXECUTE ON FUNCTION public.get_faculty_invite(text) TO anon, authenticated;

-- Called by the freshly signed-up teacher: grants the faculty role for that institute
CREATE OR REPLACE FUNCTION public.accept_faculty_invite(_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.accept_faculty_invite(text) TO authenticated;