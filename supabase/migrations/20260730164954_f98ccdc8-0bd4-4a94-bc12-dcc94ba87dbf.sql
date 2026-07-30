UPDATE public.institutes SET slug = 'vk-academy'
WHERE id = '4ca4e0de-aff8-47c2-ad54-855cea5a4571'
  AND NOT EXISTS (SELECT 1 FROM public.institutes WHERE slug = 'vk-academy');

UPDATE public.institutes SET name = 'Your Institute', status = 'active'
WHERE id = 'b9ea1af5-35d2-412d-a2bf-d3a3384d8435';