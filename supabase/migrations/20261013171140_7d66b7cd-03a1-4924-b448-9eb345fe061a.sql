ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='attendance_student_batch_date_key') THEN
    ALTER TABLE public.attendance ADD CONSTRAINT attendance_student_batch_date_key UNIQUE NULLS NOT DISTINCT (student_id, batch_id, date);
  END IF;
END $$;