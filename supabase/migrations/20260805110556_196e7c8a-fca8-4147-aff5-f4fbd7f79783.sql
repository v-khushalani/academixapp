ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_approval_status_check;
ALTER TABLE public.students ADD CONSTRAINT students_approval_status_check
  CHECK (approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'enquiry'::text]));