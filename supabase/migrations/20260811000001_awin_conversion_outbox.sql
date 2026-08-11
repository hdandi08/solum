create table public.awin_conversion_outbox (
  id uuid primary key default gen_random_uuid(),
  order_ref text not null unique
    check (
      char_length(order_ref) between 4 and 255
      and order_ref ~ '^pi_[A-Za-z0-9]+$'
    ),
  order_id uuid not null unique
    references public.orders(id) on delete restrict,
  customer_paid_pence integer not null,
  discount_pence integer not null default 0,
  delivery_pence integer not null default 0,
  vat_pence integer not null default 0,
  amount_pence integer not null,
  voucher_code text,
  financial_basis_version text not null default 'solum-commission-v1',
  currency text not null default 'GBP',
  commission_group text not null default 'DEFAULT',
  channel text not null,
  awc_ciphertext text not null,
  awc_hash text not null,
  state text not null default 'pending',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz default now(),
  last_http_status integer,
  last_error_code text,
  provider_batch_id text,
  provider_transaction_id text,
  worker_id uuid,
  lease_expires_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint awin_conversion_outbox_state_check
    check (state in ('pending','processing','sent','retry','dead_letter','suppressed')),
  constraint awin_conversion_outbox_channel_check
    check (channel in ('aw','display','ppc','email')),
  constraint awin_conversion_outbox_group_check
    check (commission_group in ('DEFAULT','NEW','EXISTING')),
  constraint awin_conversion_outbox_amount_check check (amount_pence > 0),
  constraint awin_conversion_outbox_financial_values_check check (
    customer_paid_pence > 0
    and discount_pence >= 0
    and delivery_pence >= 0
    and vat_pence >= 0
    and amount_pence = customer_paid_pence - delivery_pence - vat_pence
  ),
  constraint awin_conversion_outbox_voucher_check
    check (voucher_code is null or char_length(voucher_code) between 1 and 100),
  constraint awin_conversion_outbox_currency_check check (currency = 'GBP'),
  constraint awin_conversion_outbox_voucher_trim_check
    check (voucher_code is null or voucher_code = btrim(voucher_code)),
  constraint awin_conversion_outbox_basis_version_check
    check (char_length(financial_basis_version) between 1 and 100),
  constraint awin_conversion_outbox_ciphertext_check
    check (char_length(awc_ciphertext) between 20 and 2000 and awc_ciphertext like 'v1.%'),
  constraint awin_conversion_outbox_hash_check
    check (awc_hash ~ '^[a-f0-9]{64}$'),
  constraint awin_conversion_outbox_attempt_count_check
    check (attempt_count between 0 and 8),
  constraint awin_conversion_outbox_http_status_check
    check (last_http_status is null or last_http_status between 100 and 599),
  constraint awin_conversion_outbox_error_code_check
    check (
      last_error_code is null
      or (
        char_length(last_error_code) between 1 and 100
        and last_error_code ~ '^[A-Z0-9_]+$'
      )
    ),
  constraint awin_conversion_outbox_provider_batch_check
    check (provider_batch_id is null or char_length(provider_batch_id) between 1 and 200),
  constraint awin_conversion_outbox_provider_transaction_check
    check (
      provider_transaction_id is null
      or char_length(provider_transaction_id) between 1 and 200
    ),
  constraint awin_conversion_outbox_lease_state_check
    check (
      (
        state = 'processing'
        and worker_id is not null
        and lease_expires_at is not null
      )
      or (
        state <> 'processing'
        and worker_id is null
        and lease_expires_at is null
      )
    ),
  constraint awin_conversion_outbox_schedule_state_check
    check (
      (
        state in ('pending','retry')
        and next_attempt_at is not null
      )
      or (
        state not in ('pending','retry')
        and next_attempt_at is null
      )
    ),
  constraint awin_conversion_outbox_sent_state_check
    check ((state = 'sent') = (sent_at is not null))
);

alter table public.awin_conversion_outbox owner to postgres;
alter table public.awin_conversion_outbox enable row level security;

revoke all on table public.awin_conversion_outbox from public, anon, authenticated;
grant select, insert, update, delete on table public.awin_conversion_outbox to service_role;

create index awin_conversion_outbox_due_idx
  on public.awin_conversion_outbox (next_attempt_at, created_at, id)
  where state in ('pending', 'retry');

create index awin_conversion_outbox_expired_lease_idx
  on public.awin_conversion_outbox (lease_expires_at, created_at, id)
  where state = 'processing';

create index awin_conversion_outbox_awc_hash_idx
  on public.awin_conversion_outbox (awc_hash);

create or replace function public.guard_awin_conversion_outbox_immutable()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if (
    new.id is distinct from old.id
    or new.order_ref is distinct from old.order_ref
    or new.order_id is distinct from old.order_id
    or new.customer_paid_pence is distinct from old.customer_paid_pence
    or new.discount_pence is distinct from old.discount_pence
    or new.delivery_pence is distinct from old.delivery_pence
    or new.vat_pence is distinct from old.vat_pence
    or new.amount_pence is distinct from old.amount_pence
    or new.voucher_code is distinct from old.voucher_code
    or new.financial_basis_version is distinct from old.financial_basis_version
    or new.currency is distinct from old.currency
    or new.commission_group is distinct from old.commission_group
    or new.channel is distinct from old.channel
    or new.awc_ciphertext is distinct from old.awc_ciphertext
    or new.awc_hash is distinct from old.awc_hash
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using
      errcode = '22023',
      message = 'AWIN outbox identity and financial basis are immutable';
  end if;

  return new;
end;
$$;

alter function public.guard_awin_conversion_outbox_immutable() owner to postgres;
revoke all on function public.guard_awin_conversion_outbox_immutable()
  from public, anon, authenticated, service_role;

create trigger guard_awin_conversion_outbox_immutable
  before update on public.awin_conversion_outbox
  for each row execute function public.guard_awin_conversion_outbox_immutable();

create or replace function public.claim_awin_conversion_batch(
  p_limit integer,
  p_worker_id uuid,
  p_lease_seconds integer
)
returns setof public.awin_conversion_outbox
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using
      errcode = '22023',
      message = 'p_limit must be between 1 and 100';
  end if;
  if p_worker_id is null then
    raise exception using
      errcode = '22023',
      message = 'p_worker_id is required';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 10 or p_lease_seconds > 300 then
    raise exception using
      errcode = '22023',
      message = 'p_lease_seconds must be between 10 and 300';
  end if;

  return query
  with candidates as (
    select candidate.id, candidate.attempt_count
    from public.awin_conversion_outbox as candidate
    where (
      (
        candidate.state in ('pending', 'retry')
        and candidate.next_attempt_at <= pg_catalog.clock_timestamp()
      )
      or (
        candidate.state = 'processing'
        and candidate.lease_expires_at <= pg_catalog.clock_timestamp()
      )
    )
    order by
      coalesce(candidate.next_attempt_at, candidate.lease_expires_at),
      candidate.created_at,
      candidate.id
    for update skip locked
    limit p_limit
  ),
  exhausted as (
    update public.awin_conversion_outbox as expired
    set
      state = 'dead_letter',
      next_attempt_at = null,
      last_error_code = 'MAX_ATTEMPTS_EXHAUSTED',
      worker_id = null,
      lease_expires_at = null,
      updated_at = pg_catalog.clock_timestamp()
    from candidates
    where expired.id = candidates.id
      and candidates.attempt_count >= 8
    returning expired.id
  ),
  claimed as (
    update public.awin_conversion_outbox as outbox
    set
      state = 'processing',
      attempt_count = outbox.attempt_count + 1,
      next_attempt_at = null,
      worker_id = p_worker_id,
      lease_expires_at = pg_catalog.clock_timestamp()
        + pg_catalog.make_interval(secs => p_lease_seconds),
      updated_at = pg_catalog.clock_timestamp()
    from candidates
    where outbox.id = candidates.id
      and candidates.attempt_count < 8
    returning outbox.*
  )
  select claimed.*
  from claimed
  order by claimed.created_at, claimed.id;
end;
$$;

alter function public.claim_awin_conversion_batch(integer, uuid, integer) owner to postgres;
revoke all on function public.claim_awin_conversion_batch(integer, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_awin_conversion_batch(integer, uuid, integer)
  to service_role;

create or replace function public.complete_awin_conversion(
  p_id uuid,
  p_worker_id uuid,
  p_http_status integer,
  p_batch_id text,
  p_provider_transaction_id text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_id is null or p_worker_id is null then
    raise exception using
      errcode = '22023',
      message = 'p_id and p_worker_id are required';
  end if;
  if p_http_status is null or p_http_status < 200 or p_http_status > 299 then
    raise exception using
      errcode = '22023',
      message = 'p_http_status must be between 200 and 299';
  end if;
  if p_batch_id is not null and (
    char_length(p_batch_id) < 1
    or char_length(p_batch_id) > 200
    or p_batch_id <> btrim(p_batch_id)
  ) then
    raise exception using
      errcode = '22023',
      message = 'p_batch_id is invalid';
  end if;
  if p_provider_transaction_id is not null and (
    char_length(p_provider_transaction_id) < 1
    or char_length(p_provider_transaction_id) > 200
    or p_provider_transaction_id <> btrim(p_provider_transaction_id)
  ) then
    raise exception using
      errcode = '22023',
      message = 'p_provider_transaction_id is invalid';
  end if;

  update public.awin_conversion_outbox as outbox
  set
    state = 'sent',
    next_attempt_at = null,
    last_http_status = p_http_status,
    last_error_code = null,
    provider_batch_id = p_batch_id,
    provider_transaction_id = p_provider_transaction_id,
    worker_id = null,
    lease_expires_at = null,
    sent_at = coalesce(outbox.sent_at, pg_catalog.statement_timestamp()),
    updated_at = pg_catalog.statement_timestamp()
  where outbox.id = p_id
    and outbox.state = 'processing'
    and outbox.worker_id = p_worker_id
    and outbox.lease_expires_at > pg_catalog.clock_timestamp();

  return found;
end;
$$;

alter function public.complete_awin_conversion(uuid, uuid, integer, text, text) owner to postgres;
revoke all on function public.complete_awin_conversion(uuid, uuid, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_awin_conversion(uuid, uuid, integer, text, text)
  to service_role;

create or replace function public.retry_awin_conversion(
  p_id uuid,
  p_worker_id uuid,
  p_state text,
  p_next_attempt_at timestamptz,
  p_http_status integer,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_id is null or p_worker_id is null then
    raise exception using
      errcode = '22023',
      message = 'p_id and p_worker_id are required';
  end if;
  if p_state is null or p_state not in ('retry', 'dead_letter') then
    raise exception using
      errcode = '22023',
      message = 'p_state must be retry or dead_letter';
  end if;
  if p_http_status is not null and (p_http_status < 100 or p_http_status > 599) then
    raise exception using
      errcode = '22023',
      message = 'p_http_status must be between 100 and 599';
  end if;
  if p_error_code is null
    or char_length(p_error_code) < 1
    or char_length(p_error_code) > 100
    or p_error_code !~ '^[A-Z0-9_]+$'
  then
    raise exception using
      errcode = '22023',
      message = 'p_error_code is invalid';
  end if;
  if p_state = 'retry' and (
    p_next_attempt_at is null
    or p_next_attempt_at <= pg_catalog.clock_timestamp()
    or p_next_attempt_at > pg_catalog.clock_timestamp() + interval '7 days'
  ) then
    raise exception using
      errcode = '22023',
      message = 'p_next_attempt_at is outside the retry window';
  end if;
  if p_state = 'dead_letter' and p_next_attempt_at is not null then
    raise exception using
      errcode = '22023',
      message = 'p_next_attempt_at must be null for dead_letter';
  end if;

  update public.awin_conversion_outbox as outbox
  set
    state = case
      when p_state = 'retry' and outbox.attempt_count >= 8 then 'dead_letter'
      else p_state
    end,
    next_attempt_at = case
      when p_state = 'retry' and outbox.attempt_count >= 8 then null
      else p_next_attempt_at
    end,
    last_http_status = p_http_status,
    last_error_code = p_error_code,
    worker_id = null,
    lease_expires_at = null,
    updated_at = pg_catalog.statement_timestamp()
  where outbox.id = p_id
    and outbox.state = 'processing'
    and outbox.worker_id = p_worker_id
    and outbox.lease_expires_at > pg_catalog.clock_timestamp();

  return found;
end;
$$;

alter function public.retry_awin_conversion(uuid, uuid, text, timestamptz, integer, text)
  owner to postgres;
revoke all on function public.retry_awin_conversion(uuid, uuid, text, timestamptz, integer, text)
  from public, anon, authenticated;
grant execute on function public.retry_awin_conversion(uuid, uuid, text, timestamptz, integer, text)
  to service_role;
