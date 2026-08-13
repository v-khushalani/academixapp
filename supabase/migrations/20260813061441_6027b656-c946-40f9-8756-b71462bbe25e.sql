CREATE OR REPLACE FUNCTION public.create_institute_with_owner(_name text, _tagline text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _slug text;
  _id uuid;
  _n int := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'owner') THEN
    RAISE EXCEPTION 'You already own an institute workspace.';
  END IF;

  _slug := trim(both '-' from regexp_replace(lower(_name), '[^a-z0-9]+', '-', 'g'));
  IF _slug = '' THEN _slug := 'institute'; END IF;

  WHILE EXISTS (SELECT 1 FROM public.institutes WHERE slug = _slug) LOOP
    _n := _n + 1;
    _slug := trim(both '-' from regexp_replace(lower(_name), '[^a-z0-9]+', '-', 'g')) || '-' || _n::text;
  END LOOP;

  INSERT INTO public.institutes (name, tagline, slug)
  VALUES (_name, NULLIF(_tagline, ''), _slug)
  RETURNING id INTO _id;

  INSERT INTO public.user_roles (user_id, institute_id, role)
  VALUES (_uid, _id, 'owner');

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_institute_with_owner(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_institute_with_owner(text, text) TO authenticated;