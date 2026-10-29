ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_program_check;
UPDATE public.students SET program = NULL WHERE program IS NOT NULL AND program NOT IN ('schooling','foundation','both','jee','cet','neet');
ALTER TABLE public.students ADD CONSTRAINT students_program_check
  CHECK (program IS NULL OR program IN ('schooling','foundation','both','jee','cet','neet'));