ALTER TABLE public.plan_catalog
  ADD COLUMN IF NOT EXISTS price_1y integer,
  ADD COLUMN IF NOT EXISTS price_3y integer,
  ADD COLUMN IF NOT EXISTS price_5y integer,
  ADD COLUMN IF NOT EXISTS price_note text,
  ADD COLUMN IF NOT EXISTS show_price boolean NOT NULL DEFAULT true;

ALTER TABLE public.institutes DISABLE TRIGGER USER;

UPDATE public.plan_catalog SET price_1y = 0, price_3y = 0, price_5y = 0, show_price = true,
  price_note = 'Up to 50 students, one classroom' WHERE key = 'free';
UPDATE public.plan_catalog SET price_1y = 5990, price_3y = 14990, price_5y = 22990, show_price = true,
  price_note = 'One centre, unlimited students' WHERE key = 'growth';
UPDATE public.plan_catalog SET price_1y = 14990, price_3y = 37990, price_5y = 56990, show_price = true,
  price_note = 'Multi-branch · 5+ branches on a call', price_yearly = 14990 WHERE key = 'campus';

ALTER TABLE public.institutes ENABLE TRIGGER USER;