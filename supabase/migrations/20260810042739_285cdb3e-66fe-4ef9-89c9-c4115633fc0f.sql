-- Function to automatically generate salary expenses based on faculty base_salary and joining_date
CREATE OR REPLACE FUNCTION public.process_faculty_salaries(_institute_id uuid, _date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    f RECORD;
    expense_desc text;
BEGIN
    FOR f IN 
        SELECT id, full_name, base_salary, joining_date 
        FROM public.faculty 
        WHERE institute_id = _institute_id 
          AND status = 'active' 
          AND base_salary > 0
          AND joining_date <= _date
    LOOP
        -- Simple logic: if a salary expense for this faculty and this month doesn't exist, create it
        expense_desc := 'Salary for ' || f.full_name || ' - ' || to_char(_date, 'Month YYYY');
        
        IF NOT EXISTS (
            SELECT 1 FROM public.expenses 
            WHERE institute_id = _institute_id 
              AND faculty_id = f.id 
              AND category = 'Salary' 
              AND date >= date_trunc('month', _date)::date
              AND date <= (date_trunc('month', _date) + interval '1 month - 1 day')::date
        ) THEN
            INSERT INTO public.expenses (
                institute_id,
                faculty_id,
                amount,
                category,
                date,
                description,
                payment_method
            ) VALUES (
                _institute_id,
                f.id,
                f.base_salary,
                'Salary',
                _date,
                expense_desc,
                'Bank Transfer' -- Default
            );
        END IF;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_faculty_salaries(uuid, date) TO service_role;
