-- Founding member fields belong on customers (founding members are paying subscribers)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS is_founding_member    bool        NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_member_since timestamptz,
  ADD COLUMN IF NOT EXISTS pledge_signed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS sessions_completed    int         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_session_at       timestamptz,
  ADD COLUMN IF NOT EXISTS exit_at               timestamptz,
  ADD COLUMN IF NOT EXISTS exit_reason           text;

CREATE INDEX IF NOT EXISTS customers_founding_idx ON public.customers (is_founding_member) WHERE is_founding_member = true;

-- Update founding_job_completions to reference customers by email (already done via email column — no change needed)

-- Update the increment RPC to target customers instead of leads
CREATE OR REPLACE FUNCTION public.increment_founding_sessions(p_email text, p_now timestamptz)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.customers
  SET    sessions_completed = sessions_completed + 1,
         last_session_at    = p_now,
         updated_at         = p_now
  WHERE  email              = p_email
  AND    is_founding_member = true;
$$;

-- Seed: Harsha as founding member #1 (upsert — safe to re-run)
INSERT INTO public.customers (email, first_name, last_name, is_founding_member, founding_member_since, created_at, updated_at)
VALUES ('harsha@bysolum.com', 'Harsha', 'Dandi', true, now(), now(), now())
ON CONFLICT (email) DO UPDATE
SET is_founding_member    = true,
    founding_member_since = COALESCE(customers.founding_member_since, now()),
    first_name            = COALESCE(NULLIF(customers.first_name, ''), 'Harsha'),
    last_name             = COALESCE(NULLIF(customers.last_name, ''), 'Dandi'),
    updated_at            = now();
