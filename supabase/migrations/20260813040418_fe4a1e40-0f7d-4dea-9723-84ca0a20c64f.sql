ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see their own roles (though we use get_my_roles RPC, this is good for consistency)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Ensure service_role can do everything
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
