ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_date_unique;
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_key;