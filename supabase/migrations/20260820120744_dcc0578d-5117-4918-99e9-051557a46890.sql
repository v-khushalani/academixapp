-- Replace the blanket "any signed-in user can read" rules
DROP POLICY IF EXISTS "Batches read" ON public.batches;
CREATE POLICY "Batches read in my institute"
ON public.batches FOR SELECT TO authenticated
USING (public.is_superadmin() OR institute_id IN (SELECT public.my_institute_ids()));

DROP POLICY IF EXISTS "Tests read" ON public.tests;
CREATE POLICY "Tests read in my institute"
ON public.tests FOR SELECT TO authenticated
USING (public.is_superadmin() OR institute_id IN (SELECT public.my_institute_ids()));

-- Drop exact-duplicate policies (identical command + expression on same table)
DO $$
DECLARE d record;
BEGIN
  FOR d IN
    SELECT tablename, policyname
    FROM (
      SELECT tablename, policyname, permissive, cmd,
             coalesce(qual,'') AS q, coalesce(with_check,'') AS w,
             row_number() OVER (
               PARTITION BY tablename, permissive, cmd, coalesce(qual,''), coalesce(with_check,'')
               ORDER BY policyname
             ) AS rn
      FROM pg_policies
      WHERE schemaname = 'public'
    ) x
    WHERE rn > 1
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', d.policyname, d.tablename);
  END LOOP;
END;
$$;
