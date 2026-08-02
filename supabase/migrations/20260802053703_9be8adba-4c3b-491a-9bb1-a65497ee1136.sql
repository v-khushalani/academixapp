ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS class_level text;
CREATE INDEX IF NOT EXISTS idx_batches_class_level ON public.batches (institute_id, class_level);