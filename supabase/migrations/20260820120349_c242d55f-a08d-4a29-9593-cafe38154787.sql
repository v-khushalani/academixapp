-- Trigger-only helpers must not be callable through the API
REVOKE ALL ON FUNCTION public.lock_institute_billing_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- Index every foreign key that lacks one
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, a.attname AS col
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY (con.conkey)
    WHERE con.contype = 'f'
      AND n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.oid AND i.indkey[0] = a.attnum
      )
  LOOP
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
      'idx_' || r.tbl || '_' || r.col, r.tbl, r.col
    );
  END LOOP;
END;
$$;

-- Evaluate auth.uid() once per statement instead of once per row
DO $$
DECLARE
  p record;
  new_qual text;
  new_check text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
  LOOP
    new_qual := p.qual;
    new_check := p.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := replace(new_qual, '( SELECT auth.uid() AS uid)', 'auth.uid()');
      new_qual := replace(new_qual, 'auth.uid()', '( SELECT auth.uid() )');
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := replace(new_check, '( SELECT auth.uid() AS uid)', 'auth.uid()');
      new_check := replace(new_check, 'auth.uid()', '( SELECT auth.uid() )');
    END IF;

    IF new_qual IS NOT NULL AND new_check IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s)',
                     p.policyname, p.tablename, new_qual, new_check);
    ELSIF new_qual IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)',
                     p.policyname, p.tablename, new_qual);
    ELSIF new_check IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s)',
                     p.policyname, p.tablename, new_check);
    END IF;
  END LOOP;
END;
$$;
