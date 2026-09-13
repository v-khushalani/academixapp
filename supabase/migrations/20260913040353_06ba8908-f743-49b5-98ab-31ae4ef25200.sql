INSERT INTO public.fee_adjustments (institute_id, fee_id, student_id, kind, amount, reason)
SELECT institute_id, id, student_id, 'refund', amount_paid, 'Structure refresh - payment reversed'
FROM public.fees
WHERE id = 'bbbccc06-41e8-4cc3-a93a-4e73b9c2e7a9' AND amount_paid > 0;

UPDATE public.fees
SET amount_paid = 0, paid_date = NULL, status = 'pending', updated_at = now()
WHERE id = 'bbbccc06-41e8-4cc3-a93a-4e73b9c2e7a9';