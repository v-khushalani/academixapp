UPDATE public.fees SET status='waived', updated_at=now()
WHERE id IN ('9831b779-0f44-477c-a6a8-4fe1abcb422e','7e7e8d82-9885-4292-80e6-90f6b27a3b21')
  AND amount=0 AND amount_paid=0 AND status='pending';