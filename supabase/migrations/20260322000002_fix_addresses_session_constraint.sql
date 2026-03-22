-- Replace partial unique index on stripe_session_id with a full unique constraint.
-- PostgreSQL allows multiple NULLs in a unique index (NULL != NULL), so this is safe.
-- The full constraint is required for ON CONFLICT targeting.

DROP INDEX IF EXISTS addresses_stripe_session_id_idx;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'addresses_stripe_session_id_key'
      AND conrelid = 'public.addresses'::regclass
  ) THEN
    ALTER TABLE public.addresses
      ADD CONSTRAINT addresses_stripe_session_id_key UNIQUE (stripe_session_id);
  END IF;
END $$;
