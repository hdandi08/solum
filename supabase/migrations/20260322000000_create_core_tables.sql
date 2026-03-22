-- supabase/migrations/20260322000000_create_core_tables.sql

create table if not exists public.customers (
  id                 uuid        primary key default gen_random_uuid(),
  email              text        not null unique,
  first_name         text,
  last_name          text,
  birth_year         integer,
  birth_month        integer,
  stripe_customer_id text        unique,
  kit_id             text,
  subscribed_at      timestamptz,
  supabase_user_id   uuid        unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists customers_email_idx           on public.customers (email);
create index if not exists customers_stripe_customer_idx on public.customers (stripe_customer_id);
create index if not exists customers_supabase_user_idx   on public.customers (supabase_user_id);

create table if not exists public.subscriptions (
  id                     uuid        primary key default gen_random_uuid(),
  customer_id            uuid        not null references public.customers(id) on delete cascade,
  stripe_subscription_id text        unique,
  kit_id                 text,
  status                 text        not null default 'active',
  months_active          integer     not null default 0,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at              timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx   on public.subscriptions (customer_id);
create index if not exists subscriptions_stripe_sub_idx on public.subscriptions (stripe_subscription_id);
create index if not exists subscriptions_status_idx     on public.subscriptions (status);

create table if not exists public.orders (
  id                uuid        primary key default gen_random_uuid(),
  customer_id       uuid        not null references public.customers(id) on delete cascade,
  subscription_id   uuid        references public.subscriptions(id),
  stripe_payment_id text,
  kit_id            text,
  order_type        text        not null,
  box_number        integer,
  amount_pence      integer     not null default 0,
  status            text        not null default 'paid',
  created_at        timestamptz not null default now()
);

create index if not exists orders_customer_idx       on public.orders (customer_id);
create index if not exists orders_stripe_payment_idx on public.orders (stripe_payment_id);
create index if not exists orders_status_idx         on public.orders (status);

create table if not exists public.events (
  id              uuid        primary key default gen_random_uuid(),
  stripe_event_id text        unique,
  event_type      text        not null,
  customer_id     uuid        references public.customers(id),
  data            jsonb       not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists events_stripe_event_idx on public.events (stripe_event_id);
create index if not exists events_customer_idx     on public.events (customer_id);
create index if not exists events_type_idx         on public.events (event_type);
