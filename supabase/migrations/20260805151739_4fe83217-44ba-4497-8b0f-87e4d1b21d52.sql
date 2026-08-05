ALTER TYPE public.fee_status ADD VALUE IF NOT EXISTS 'cancelled';

CREATE TABLE IF NOT EXISTS public.fee_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  fee_id uuid NOT NULL REFERENCES public.fees(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('cancel','refund')),
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.fee_adjustments TO authenticated;
GRANT ALL ON public.fee_adjustments TO service_role;

ALTER TABLE public.fee_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read fee adjustments" ON public.fee_adjustments
FOR SELECT TO authenticated
USING (public.is_superadmin() OR institute_id = public.current_institute_id());

CREATE POLICY "staff create fee adjustments" ON public.fee_adjustments
FOR INSERT TO authenticated
WITH CHECK (
  (public.is_superadmin() OR institute_id = public.current_institute_id())
  AND (public.is_superadmin() OR public.has_any_role(auth.uid(), ARRAY['owner','admin','accountant','receptionist']::app_role[]))
);

CREATE INDEX IF NOT EXISTS fee_adjustments_fee_idx ON public.fee_adjustments(fee_id);