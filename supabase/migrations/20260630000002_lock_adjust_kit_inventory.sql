-- Lock down adjust_kit_inventory: it must be callable ONLY by the service role
-- (the Stripe webhook). Supabase's default privileges grant EXECUTE to the
-- `anon` and `authenticated` roles on new functions in the public schema,
-- independently of PUBLIC — so the prior REVOKE ... FROM PUBLIC left the RPC
-- reachable with the public anon key, allowing arbitrary stock manipulation.
-- Revoke from those roles explicitly. service_role retains EXECUTE (granted in
-- 20260630000001).

REVOKE ALL ON FUNCTION public.adjust_kit_inventory(text, int) FROM PUBLIC, anon, authenticated;
