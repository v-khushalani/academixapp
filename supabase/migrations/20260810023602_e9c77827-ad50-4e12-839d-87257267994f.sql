-- Migration to allow reordering syllabus chapters and support status reversals
-- 1. Function to reorder chapters based on an array of IDs
CREATE OR REPLACE FUNCTION public.reorder_syllabus_chapters(_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We use a CTE to pair IDs with their new positions
  UPDATE public.syllabus_chapters sc
  SET position = new_pos
  FROM (
    SELECT unnest(_ids) as id, generate_series(1, array_length(_ids, 1)) as new_pos
  ) x
  WHERE sc.id = x.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_syllabus_chapters(uuid[]) TO authenticated;
