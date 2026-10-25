ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS locked_by uuid;

CREATE OR REPLACE FUNCTION public.block_locked_test_results()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tid uuid := COALESCE(NEW.test_id, OLD.test_id);
BEGIN
  IF EXISTS (SELECT 1 FROM public.tests WHERE id = _tid AND locked_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Marks are closed for this test and cannot be changed';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_block_locked_test_results ON public.test_results;
CREATE TRIGGER trg_block_locked_test_results BEFORE INSERT OR UPDATE OR DELETE ON public.test_results
FOR EACH ROW EXECUTE FUNCTION public.block_locked_test_results();

CREATE OR REPLACE FUNCTION public.block_locked_test_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.locked_at IS NOT NULL THEN RAISE EXCEPTION 'This test is closed and cannot be deleted'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'This test is closed and cannot be changed';
  END IF;
  IF NEW.locked_at IS NOT NULL AND NEW.locked_by IS NULL THEN NEW.locked_by := auth.uid(); END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_block_locked_test_edit ON public.tests;
CREATE TRIGGER trg_block_locked_test_edit BEFORE UPDATE OR DELETE ON public.tests
FOR EACH ROW EXECUTE FUNCTION public.block_locked_test_edit();