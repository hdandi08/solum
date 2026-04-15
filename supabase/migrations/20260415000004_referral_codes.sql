-- Referral code on customers (founding members get a unique shareable code)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Track which referral code brought each lead in
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS referred_by TEXT;

CREATE INDEX IF NOT EXISTS customers_referral_code_idx ON public.customers (referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_referred_by_idx ON public.leads (referred_by)
  WHERE referred_by IS NOT NULL;
