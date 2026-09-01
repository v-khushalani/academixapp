-- Public admission/enquiry pages must show the institute from the QR link,
-- never whatever institute happens to be cached in that phone's browser.
CREATE OR REPLACE FUNCTION public.public_institute_brand(_slug text)
RETURNS TABLE (name text, logo_url text, primary_color text, custom_branding boolean, plan text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.name, i.logo_url, i.primary_color, coalesce(i.custom_branding, false), i.plan
  FROM public.institutes i
  WHERE i.slug = btrim(_slug)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.public_institute_brand(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_institute_brand(text) TO anon, authenticated;
