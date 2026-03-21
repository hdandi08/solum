create table if not exists public.leads (
  id                uuid        primary key default gen_random_uuid(),
  email             text        not null,
  first_name        text,
  last_name         text,
  birth_year        integer,
  birth_month       integer,
  kit_id            text,
  stripe_session_id text        unique,
  stripe_customer_id text,
  checkout_status   text        not null default 'initiated',
  decline_reason    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists leads_email_idx              on public.leads (email);
create index if not exists leads_stripe_session_idx     on public.leads (stripe_session_id);
create index if not exists leads_stripe_customer_idx    on public.leads (stripe_customer_id);
create index if not exists leads_checkout_status_idx    on public.leads (checkout_status);
