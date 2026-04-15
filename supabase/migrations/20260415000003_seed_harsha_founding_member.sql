-- Ensure harsha@bysolum.com exists as an active founding member
-- Safe to re-run: upsert on email, only sets founding fields if not already set

INSERT INTO public.customers (
  email, first_name, last_name,
  is_founding_member, founding_member_since,
  created_at, updated_at
)
VALUES (
  'harsha@bysolum.com', 'Harsha', 'Dandi',
  true, now(),
  now(), now()
)
ON CONFLICT (email) DO UPDATE
SET
  is_founding_member    = true,
  founding_member_since = COALESCE(customers.founding_member_since, now()),
  first_name            = COALESCE(NULLIF(customers.first_name, ''), 'Harsha'),
  last_name             = COALESCE(NULLIF(customers.last_name, ''), 'Dandi'),
  exit_at               = NULL,
  updated_at            = now();
