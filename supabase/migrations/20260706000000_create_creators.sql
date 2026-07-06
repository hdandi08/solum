-- SOLUM Creator Program — CRM record + outreach tracking log.
create table if not exists public.creators (
  id                 uuid        primary key default gen_random_uuid(),
  name               text,
  email              text        not null,
  instagram_handle   text,
  tiktok_handle      text,
  niches             text[]      not null default '{}',
  follower_count     integer,
  location           text,
  deal_types         text[]      not null default '{}',
  portfolio_url      text,
  aesthetic_score    integer,
  stage              text        not null default 'contacted',
  source             text        not null default 'manual',
  sequence_status    text        not null default 'active',
  sequence_step      integer     not null default 0,
  next_email_at      timestamptz,
  unsubscribed       boolean     not null default false,
  unsubscribe_token  uuid        not null default gen_random_uuid(),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- One creator per email (prevents double-enrolment). Case-insensitive.
create unique index if not exists creators_email_lower_idx on public.creators (lower(email));
create index if not exists creators_stage_idx        on public.creators (stage);
create index if not exists creators_sequence_due_idx  on public.creators (sequence_status, next_email_at);
create index if not exists creators_unsub_token_idx   on public.creators (unsubscribe_token);

create table if not exists public.creator_emails (
  id            uuid        primary key default gen_random_uuid(),
  creator_id    uuid        not null references public.creators(id) on delete cascade,
  step          integer     not null,
  template_key  text        not null,
  subject       text        not null,
  resend_id     text,
  sent_at       timestamptz,
  delivered_at  timestamptz,
  opened_at     timestamptz,
  clicked_at    timestamptz,
  bounced_at    timestamptz,
  open_count    integer     not null default 0,
  click_count   integer     not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists creator_emails_creator_idx on public.creator_emails (creator_id);
create index if not exists creator_emails_resend_idx   on public.creator_emails (resend_id);

-- PII: enable RLS with no policies so only the service role reaches these rows.
alter table public.creators       enable row level security;
alter table public.creator_emails enable row level security;
