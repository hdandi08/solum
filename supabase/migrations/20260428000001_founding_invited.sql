-- founding_invited_at: tracks people who have been invited but not yet pledged.
-- is_founding_member is only set to true AFTER the pledge is signed.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS founding_invited_at timestamptz;

CREATE INDEX IF NOT EXISTS customers_founding_invited_idx
  ON public.customers (founding_invited_at)
  WHERE founding_invited_at IS NOT NULL;

-- Seed: invite harsha@pricedab.com so they can access the founding portal
INSERT INTO public.customers (email, first_name, last_name, founding_invited_at, created_at, updated_at)
VALUES ('harsha@pricedab.com', 'Harsha', 'Dandi', now(), now(), now())
ON CONFLICT (email) DO UPDATE
SET founding_invited_at = COALESCE(customers.founding_invited_at, now()),
    updated_at          = now();
