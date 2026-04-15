-- Founding member fields on leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_founding_member  bool        NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_member_since timestamptz,
  ADD COLUMN IF NOT EXISTS pledge_signed_at    timestamptz,
  ADD COLUMN IF NOT EXISTS supabase_user_id    uuid        UNIQUE REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS sessions_completed  int         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_session_at     timestamptz,
  ADD COLUMN IF NOT EXISTS exit_at             timestamptz,
  ADD COLUMN IF NOT EXISTS exit_reason         text;

CREATE INDEX IF NOT EXISTS leads_founding_idx        ON public.leads (is_founding_member) WHERE is_founding_member = true;
CREATE INDEX IF NOT EXISTS leads_founding_user_idx   ON public.leads (supabase_user_id);

-- Jobs posted by SOLUM
CREATE TABLE IF NOT EXISTS public.founding_jobs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text        NOT NULL,
  type        text        NOT NULL DEFAULT 'survey',   -- 'survey' | 'submit' | 'vote'
  points      int         NOT NULL DEFAULT 2,
  opens_at    timestamptz NOT NULL DEFAULT now(),
  closes_at   timestamptz,
  schema      jsonb       NOT NULL DEFAULT '[]',       -- question definitions
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS founding_jobs_opens_idx ON public.founding_jobs (opens_at);

-- Member completions
CREATE TABLE IF NOT EXISTS public.founding_job_completions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL,
  job_id        uuid        NOT NULL REFERENCES public.founding_jobs(id),
  responses     jsonb       NOT NULL,
  points_earned int         NOT NULL DEFAULT 2,
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, job_id)
);

CREATE INDEX IF NOT EXISTS founding_completions_email_idx ON public.founding_job_completions (email);
CREATE INDEX IF NOT EXISTS founding_completions_job_idx   ON public.founding_job_completions (job_id);

-- RPC used by submit-founding-job to increment participation counters atomically
CREATE OR REPLACE FUNCTION public.increment_founding_sessions(p_email text, p_now timestamptz)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.leads
  SET    sessions_completed = sessions_completed + 1,
         last_session_at    = p_now,
         updated_at         = p_now
  WHERE  email              = p_email
  AND    is_founding_member = true;
$$;
