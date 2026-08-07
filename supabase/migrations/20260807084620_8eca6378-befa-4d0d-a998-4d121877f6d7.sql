CREATE OR REPLACE FUNCTION public.my_faculty_batch_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT b.id
  FROM public.batches b
  WHERE b.faculty_id = auth.uid()
     OR b.faculty_id IN (SELECT f.id FROM public.faculty f WHERE f.user_id = auth.uid())
     OR b.id IN (
        SELECT ts.batch_id FROM public.timetable_slots ts
        WHERE ts.batch_id IS NOT NULL
          AND ts.faculty_id IN (SELECT f2.id FROM public.faculty f2 WHERE f2.user_id = auth.uid())
     );
$function$;

ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_preferred_contact_check;
ALTER TABLE public.students ADD CONSTRAINT students_preferred_contact_check
  CHECK (preferred_contact = ANY (ARRAY['father'::text, 'mother'::text, 'self'::text]));

DELETE FROM public.students WHERE id = '06062bb3-5835-4373-9f58-548173f1eb73';