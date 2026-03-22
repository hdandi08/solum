create table if not exists public.addresses (
  id                uuid        primary key default gen_random_uuid(),
  customer_id       uuid        not null references public.customers(id) on delete cascade,
  stripe_session_id text,
  name              text        not null,
  line1             text        not null,
  line2             text,
  city              text        not null,
  postcode          text        not null,
  country           text        not null default 'GB',
  is_current        boolean     not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists addresses_customer_current_idx
  on public.addresses (customer_id, is_current);

create unique index if not exists addresses_stripe_session_idx
  on public.addresses (stripe_session_id)
  where stripe_session_id is not null;
