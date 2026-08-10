
-- Add receipt template selection to institutes
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS receipt_template text DEFAULT 'classic';

-- Update the platform console detail RPC to include the receipt template
CREATE OR REPLACE FUNCTION public.platform_update_institute(
    _id uuid,
    _plan text,
    _student_limit integer,
    _room_limit integer,
    _batch_limit integer,
    _faculty_limit integer,
    _staff_login_limit integer,
    _teacher_login_limit integer,
    _features jsonb,
    _installment_plan jsonb,
    _parent_institute_id uuid DEFAULT NULL,
    _clear_parent boolean DEFAULT false,
    _receipt_template text DEFAULT 'classic'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Only superadmins can manage institute limits.';
    END IF;

    UPDATE public.institutes
    SET 
        plan = _plan,
        student_limit = _student_limit,
        room_limit = _room_limit,
        batch_limit = _batch_limit,
        faculty_limit = _faculty_limit,
        staff_login_limit = _staff_login_limit,
        teacher_login_limit = _teacher_login_limit,
        features = _features,
        installment_plan = _installment_plan,
        receipt_template = _receipt_template,
        parent_institute_id = CASE WHEN _clear_parent THEN NULL ELSE COALESCE(_parent_institute_id, parent_institute_id) END,
        updated_at = now()
    WHERE id = _id;
END;
$$;
