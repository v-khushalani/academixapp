-- 1. Clear orphan role rows (no institute linkage, not superadmin)
DELETE FROM public.user_roles WHERE institute_id IS NULL AND role <> 'superadmin'::app_role;

-- 2. Drop the tautological user_roles policy
DROP POLICY IF EXISTS "Users can view roles in their institute" ON public.user_roles;

-- 3. Scope admin profile updates to the caller's own institute
DROP POLICY IF EXISTS "Profiles: admin update any" ON public.profiles;

CREATE POLICY "Profiles: admin update in own institute"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['owner'::app_role, 'admin'::app_role])
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id
      AND ur.institute_id IN (SELECT public.my_institute_ids())
  )
)
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['owner'::app_role, 'admin'::app_role])
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id
      AND ur.institute_id IN (SELECT public.my_institute_ids())
  )
);

-- 4. Restrictive tenant fence on profiles: only self, same-institute members, or superadmin
CREATE POLICY "Profiles tenant restrictive"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  id = auth.uid()
  OR public.is_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id
      AND ur.institute_id IN (SELECT public.my_institute_ids())
  )
)
WITH CHECK (
  id = auth.uid()
  OR public.is_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id
      AND ur.institute_id IN (SELECT public.my_institute_ids())
  )
);