DROP TABLE IF EXISTS public.student_activities CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.automation_rules CASCADE;
DROP TABLE IF EXISTS public.student_documents CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
ALTER TABLE public.batches DROP COLUMN IF EXISTS course_id;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TYPE IF EXISTS public.activity_source;
