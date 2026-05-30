-- ── Enable RLS on all tables ──────────────────────────────────────────────────
-- Admin panel uses service_role key which bypasses RLS entirely.
-- Customer-facing tables get auth.uid() policies for the storefront.
-- Admin-only tables: RLS on with no policies = anon/authenticated blocked, service_role bypasses.

-- ── Core tables (original migration) ─────────────────────────────────────────

ALTER TABLE public.customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events            ENABLE ROW LEVEL SECURITY;

-- ── New tables (migrations 000001 + 000002) ───────────────────────────────────

ALTER TABLE public.payment_attempts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_issues    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_inventory     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookkeeping_entries ENABLE ROW LEVEL SECURITY;

-- ── Customer-facing policies ──────────────────────────────────────────────────
-- Storefront: customers can only read/write their own rows.
-- Join pattern used for tables that reference customer_id not supabase_user_id directly.

DROP POLICY IF EXISTS "customers: own row"          ON public.customers;
DROP POLICY IF EXISTS "subscriptions: own customer" ON public.subscriptions;
DROP POLICY IF EXISTS "orders: own customer"        ON public.orders;
DROP POLICY IF EXISTS "addresses: own customer"     ON public.addresses;
DROP POLICY IF EXISTS "kit_inventory: public read"  ON public.kit_inventory;

CREATE POLICY "customers: own row"
  ON public.customers
  FOR ALL
  USING (auth.uid() = supabase_user_id);

CREATE POLICY "subscriptions: own customer"
  ON public.subscriptions
  FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "orders: own customer"
  ON public.orders
  FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "addresses: own customer"
  ON public.addresses
  FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE supabase_user_id = auth.uid()
    )
  );

-- kit_inventory: anon read allowed (storefront needs to check availability)
CREATE POLICY "kit_inventory: public read"
  ON public.kit_inventory
  FOR SELECT
  USING (true);

-- ── Admin-only tables: no policies ───────────────────────────────────────────
-- events, payment_attempts, payment_issues, bookkeeping_entries
-- RLS enabled = anon/authenticated blocked. Service role bypasses (admin panel).
-- No policies needed here.
