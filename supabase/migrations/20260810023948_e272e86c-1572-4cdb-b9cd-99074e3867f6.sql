-- 1. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    category text NOT NULL, -- 'Salary', 'Rent', 'Electricity', 'Marketing', etc.
    amount numeric NOT NULL CHECK (amount >= 0),
    date date NOT NULL DEFAULT CURRENT_DATE,
    description text,
    payment_method text, -- 'Cash', 'UPI', 'Bank Transfer'
    faculty_id uuid REFERENCES public.faculty(id) ON DELETE SET NULL, -- For salary linkage
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institutes can manage their own expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (institute_id = (SELECT public.current_institute_id()));

-- Add 'salary' column to faculty if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'faculty' AND COLUMN_NAME = 'base_salary') THEN
    ALTER TABLE public.faculty ADD COLUMN base_salary numeric DEFAULT 0;
  END IF;
END $$;
