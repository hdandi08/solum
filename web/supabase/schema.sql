-- SOLUM — Supabase Schema
-- Run this in the Supabase SQL editor: dashboard → SQL Editor → New query

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────
create table if not exists customers (
  id                  uuid primary key default uuid_generate_v4(),
  email               text unique not null,
  first_name          text,
  last_name           text,
  birth_year          integer,          -- rough DOB for segmentation (year only — no need for exact date)
  birth_month         integer,          -- 1–12, optional — gives age band precision without PII overreach
  stripe_customer_id  text unique,
  kit_id              text,              -- 'ground' | 'ritual' | 'sovereign'
  subscribed_at       timestamptz,
  created_at          timestamptz default now()
);

-- ─────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────
create table if not exists subscriptions (
  id                      uuid primary key default uuid_generate_v4(),
  customer_id             uuid references customers(id) on delete cascade,
  stripe_subscription_id  text unique,
  kit_id                  text not null,    -- 'ground' | 'ritual' | 'sovereign'
  status                  text not null default 'active',  -- 'active' | 'paused' | 'cancelled'
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  months_active           integer default 0,
  -- Loyalty: t-shirt earned at month 6
  tshirt_size             text,             -- collected at month 3 prompt
  tshirt_sent             boolean default false,
  created_at              timestamptz default now()
);

-- ─────────────────────────────────────────
-- ORDERS
--
-- One row per monthly charge. order_type is either:
--   'first_box' — the one-time kit purchase
--   'refill'    — every subsequent monthly charge (same price always)
--
-- box_number tracks which refill this is (1, 2, 3 …).
-- Application logic derives box contents from box_number + kit_id:
--   box_number % 3 == 0  →  quarterly box: 01+02+03+05 (+ 06 if ritual/sovereign)
--                              + 04 scalp massager if box_number == 6 or 12
--   all other months     →  small monthly box: 01+07+08
-- ─────────────────────────────────────────
create table if not exists orders (
  id                  uuid primary key default uuid_generate_v4(),
  customer_id         uuid references customers(id) on delete cascade,
  subscription_id     uuid references subscriptions(id),
  stripe_payment_id   text,
  kit_id              text not null,
  order_type          text not null,    -- 'first_box' | 'refill'
  box_number          integer,          -- null for first_box; 1, 2, 3 … for refills
  amount_pence        integer not null,
  status              text not null default 'pending',  -- 'pending' | 'paid' | 'shipped' | 'delivered'
  created_at          timestamptz default now()
);

-- ─────────────────────────────────────────
-- EVENTS (behavioural stream)
-- Lightweight log of customer signals for cohort analysis,
-- churn prediction, and comms triggers.
-- ─────────────────────────────────────────
create table if not exists events (
  id              uuid primary key default uuid_generate_v4(),
  customer_id     uuid references customers(id) on delete set null,
  stripe_event_id text unique not null,
  event_type      text not null,   -- mirrors Stripe event type
  data            jsonb,           -- raw payload fields we care about
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- WAITLIST (coming soon sign-ups)
-- ─────────────────────────────────────────
create table if not exists waitlist (
  id          uuid primary key default uuid_generate_v4(),
  email       text unique not null,
  source      text default 'coming_soon',
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table customers     enable row level security;
alter table subscriptions enable row level security;
alter table orders        enable row level security;
alter table waitlist      enable row level security;

-- Customers can only read/update their own row
create policy "customers: own row" on customers
  for all using (auth.uid() = id);

-- Subscriptions visible to the owning customer
create policy "subscriptions: own" on subscriptions
  for all using (
    customer_id in (select id from customers where id = auth.uid())
  );

-- Orders visible to the owning customer
create policy "orders: own" on orders
  for all using (
    customer_id in (select id from customers where id = auth.uid())
  );

-- Waitlist: anyone can insert, nobody can read via client (service role only)
create policy "waitlist: insert only" on waitlist
  for insert with check (true);

-- Events: customers can read their own events, never write (service role only)
alter table events enable row level security;
create policy "events: own read" on events
  for select using (
    customer_id in (select id from customers where id = auth.uid())
  );
