-- Track returning customers on the subscriptions table.
-- subscription_number: 1 for first subscription, 2 for re-subscription, etc.
-- previous_subscription_id: explicit FK to the prior subscription for easy cohort queries.

ALTER TABLE public.subscriptions
  ADD COLUMN subscription_number      integer,
  ADD COLUMN previous_subscription_id uuid references public.subscriptions(id);

-- Default existing rows to subscription_number = 1
UPDATE public.subscriptions SET subscription_number = 1 WHERE subscription_number IS NULL;

ALTER TABLE public.subscriptions
  ALTER COLUMN subscription_number SET DEFAULT 1,
  ALTER COLUMN subscription_number SET NOT NULL;

CREATE INDEX IF NOT EXISTS subscriptions_number_idx   ON public.subscriptions (customer_id, subscription_number);
CREATE INDEX IF NOT EXISTS subscriptions_prev_sub_idx ON public.subscriptions (previous_subscription_id);
