-- ── Phone on addresses ────────────────────────────────────────────────────────
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS phone text;

-- ── payment_attempts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id              uuid        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id                 uuid        REFERENCES public.orders(id) ON DELETE SET NULL,
  stripe_invoice_id        text        NOT NULL,
  stripe_payment_intent_id text,
  amount_pence             int         NOT NULL,
  status                   text        NOT NULL CHECK (status IN ('succeeded','failed')),
  attempt_number           int         NOT NULL DEFAULT 1,
  failure_code             text,
  failure_message          text,
  attempted_at             timestamptz NOT NULL DEFAULT now(),
  next_retry_at            timestamptz
);

-- One row per invoice per attempt number
CREATE UNIQUE INDEX IF NOT EXISTS pa_invoice_attempt_uidx
  ON public.payment_attempts (stripe_invoice_id, attempt_number);

-- Customer timeline drill-down
CREATE INDEX IF NOT EXISTS pa_customer_time_idx
  ON public.payment_attempts (customer_id, attempted_at DESC);

-- History tab: filter by status + date range
CREATE INDEX IF NOT EXISTS pa_status_time_idx
  ON public.payment_attempts (status, attempted_at DESC);

-- Date-only filter
CREATE INDEX IF NOT EXISTS pa_time_idx
  ON public.payment_attempts (attempted_at DESC);

-- Partial index — failed only (most common filter, small subset)
CREATE INDEX IF NOT EXISTS pa_failed_idx
  ON public.payment_attempts (attempted_at DESC)
  WHERE status = 'failed';

-- ── payment_issues ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_issues (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       uuid        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  stripe_invoice_id text        NOT NULL,
  issue_type        text        NOT NULL CHECK (issue_type IN ('all_retries_failed','disputed','bank_block')),
  total_attempts    int         NOT NULL DEFAULT 4,
  last_failure_code text,
  resolved          boolean     NOT NULL DEFAULT false,
  resolution_note   text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  resolved_at       timestamptz
);

-- Needs Action tab — unresolved only (partial keeps index tiny)
CREATE INDEX IF NOT EXISTS pi_unresolved_time_idx
  ON public.payment_issues (created_at DESC)
  WHERE resolved = false;

-- Customer drill-down
CREATE INDEX IF NOT EXISTS pi_customer_idx
  ON public.payment_issues (customer_id, created_at DESC);

-- History with resolved filter
CREATE INDEX IF NOT EXISTS pi_resolved_time_idx
  ON public.payment_issues (resolved, created_at DESC);

-- ── subscriptions additions ───────────────────────────────────────────────────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_status        text        NOT NULL DEFAULT 'active'
    CHECK (payment_status IN ('active','past_due','unpaid','cancelled')),
  ADD COLUMN IF NOT EXISTS consecutive_failures  int         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_at       timestamptz,
  ADD COLUMN IF NOT EXISTS next_payment_due      timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_reason      text
    CHECK (cancelled_reason IN ('payment_failed','user_cancelled','admin_cancelled'));

-- Upcoming payments dashboard query
CREATE INDEX IF NOT EXISTS sub_upcoming_idx
  ON public.subscriptions (payment_status, next_payment_due)
  WHERE payment_status = 'active';

-- At-risk view — partial index on non-active only
CREATE INDEX IF NOT EXISTS sub_atrisk_idx
  ON public.subscriptions (payment_status, next_payment_due)
  WHERE payment_status != 'active';
