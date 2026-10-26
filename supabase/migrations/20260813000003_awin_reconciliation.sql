create table public.awin_transactions (
  awin_transaction_id text primary key
    check (
      awin_transaction_id = btrim(awin_transaction_id)
      and char_length(awin_transaction_id) between 1 and 200
    ),
  order_ref text
    check (
      order_ref is null
      or (
        order_ref = btrim(order_ref)
        and char_length(order_ref) between 1 and 255
      )
    ),
  order_id uuid references public.orders(id) on delete set null,
  publisher_id bigint
    references public.awin_publishers(publisher_id) on delete set null,
  transaction_date timestamptz not null,
  click_date timestamptz,
  status text not null
    check (status in ('pending', 'approved', 'declined', 'deleted', 'unknown')),
  sale_amount_pence integer not null,
  commission_pence integer not null,
  network_fee_pence integer,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  commission_group text
    check (
      commission_group is null
      or commission_group ~ '^[A-Z0-9_]{1,50}$'
    ),
  click_reference text
    check (
      click_reference is null
      or char_length(click_reference) between 1 and 500
    ),
  voucher_code text
    check (
      voucher_code is null
      or char_length(voucher_code) between 1 and 500
    ),
  raw_hash text not null check (raw_hash ~ '^[a-f0-9]{64}$'),
  first_seen_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    first_seen_at <= last_synced_at
    and first_seen_at <= updated_at
  )
);

create or replace function public.guard_awin_transaction_deleted_status()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.status = 'deleted'
    and new.status is distinct from 'deleted'
  then
    raise exception using
      errcode = '22023',
      message = 'awin_deleted_transaction_status_is_terminal';
  end if;

  return new;
end;
$$;

create trigger guard_awin_transaction_deleted_status
before update of status on public.awin_transactions
for each row
execute function public.guard_awin_transaction_deleted_status();

create index awin_transactions_order_ref_idx
  on public.awin_transactions (order_ref)
  where order_ref is not null;

create index awin_transactions_transaction_date_idx
  on public.awin_transactions (transaction_date);

create index awin_transactions_publisher_date_idx
  on public.awin_transactions (publisher_id, transaction_date)
  where publisher_id is not null;

create table public.awin_publisher_performance_daily (
  performance_date date not null,
  publisher_id bigint not null
    references public.awin_publishers(publisher_id) on delete cascade,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  impressions integer not null check (impressions >= 0),
  clicks integer not null check (clicks >= 0),
  pending_count integer not null check (pending_count >= 0),
  pending_value_pence integer not null,
  pending_commission_pence integer not null,
  confirmed_count integer not null check (confirmed_count >= 0),
  confirmed_value_pence integer not null,
  confirmed_commission_pence integer not null,
  declined_count integer not null check (declined_count >= 0),
  declined_value_pence integer not null,
  declined_commission_pence integer not null,
  bonus_count integer not null check (bonus_count >= 0),
  bonus_value_pence integer not null,
  bonus_commission_pence integer not null,
  total_count integer not null check (total_count >= 0),
  total_value_pence integer not null,
  total_commission_pence integer not null,
  network_fee_pence integer,
  tags jsonb not null default '[]'::jsonb
    check (jsonb_typeof(tags) = 'array'),
  raw_hash text not null check (raw_hash ~ '^[a-f0-9]{64}$'),
  first_seen_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (performance_date, publisher_id, currency),
  check (
    first_seen_at <= last_synced_at
    and first_seen_at <= updated_at
  )
);

create index awin_publisher_performance_daily_publisher_date_idx
  on public.awin_publisher_performance_daily (publisher_id, performance_date);

create or replace function public.stamp_awin_import_lifecycle()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_imported_at timestamptz := pg_catalog.clock_timestamp();
begin
  if tg_op = 'INSERT' then
    new.first_seen_at := v_imported_at;
  else
    new.first_seen_at := old.first_seen_at;
  end if;

  new.last_synced_at := v_imported_at;
  new.updated_at := v_imported_at;
  return new;
end;
$$;

create trigger stamp_awin_transactions_lifecycle
before insert or update on public.awin_transactions
for each row
execute function public.stamp_awin_import_lifecycle();

create trigger stamp_awin_publisher_performance_daily_lifecycle
before insert or update on public.awin_publisher_performance_daily
for each row
execute function public.stamp_awin_import_lifecycle();

create table public.awin_sync_runs (
  id uuid primary key default gen_random_uuid(),
  sync_type text not null
    check (sync_type in ('publishers', 'transactions', 'performance', 'reconcile')),
  range_start timestamptz,
  range_end timestamptz,
  -- Safe paging progress only. Provider URLs, tokens, and response fragments
  -- have no representable key or value type in this closed object.
  cursor jsonb not null default '{}'::jsonb
    check (jsonb_typeof(cursor) = 'object')
    check (pg_column_size(cursor) <= 512)
    check (
      cursor - array['page', 'next_page', 'page_size', 'offset'] = '{}'::jsonb
    )
    check (
      not (cursor ? 'page')
      or (
        jsonb_typeof(cursor -> 'page') = 'number'
        and cursor ->> 'page' ~ '^[0-9]+$'
        and (cursor ->> 'page')::numeric between 1 and 1000000
      )
    )
    check (
      not (cursor ? 'next_page')
      or (
        jsonb_typeof(cursor -> 'next_page') = 'number'
        and cursor ->> 'next_page' ~ '^[0-9]+$'
        and (cursor ->> 'next_page')::numeric between 1 and 1000000
      )
    )
    check (
      not (cursor ? 'page_size')
      or (
        jsonb_typeof(cursor -> 'page_size') = 'number'
        and cursor ->> 'page_size' ~ '^[0-9]+$'
        and (cursor ->> 'page_size')::numeric between 1 and 500
      )
    )
    check (
      not (cursor ? 'offset')
      or (
        jsonb_typeof(cursor -> 'offset') = 'number'
        and cursor ->> 'offset' ~ '^[0-9]+$'
        and (cursor ->> 'offset')::numeric between 0 and 2147483647
      )
    ),
  rows_read integer not null default 0 check (rows_read >= 0),
  rows_upserted integer not null default 0 check (rows_upserted >= 0),
  rows_rejected integer not null default 0 check (rows_rejected >= 0),
  api_call_count integer not null default 0 check (api_call_count >= 0),
  outcome text not null default 'running'
    check (outcome in ('running', 'succeeded', 'failed')),
  error_code text
    check (
      error_code is null
      or error_code ~ '^[A-Z][A-Z0-9_]{0,99}$'
    ),
  -- Sanitised run summary only. String values are closed enums and every
  -- numeric value is an integer with an operational bound.
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object')
    check (pg_column_size(metadata) <= 512)
    check (
      metadata - array[
        'date_type',
        'trigger',
        'pages_processed',
        'batches_processed',
        'batch_size'
      ] = '{}'::jsonb
    )
    check (
      not (metadata ? 'date_type')
      or (
        jsonb_typeof(metadata -> 'date_type') = 'string'
        and metadata ->> 'date_type' in (
          'transaction',
          'validation',
          'amendment'
        )
      )
    )
    check (
      not (metadata ? 'trigger')
      or (
        jsonb_typeof(metadata -> 'trigger') = 'string'
        and metadata ->> 'trigger' in ('scheduled', 'manual', 'backfill')
      )
    )
    check (
      not (metadata ? 'pages_processed')
      or (
        jsonb_typeof(metadata -> 'pages_processed') = 'number'
        and metadata ->> 'pages_processed' ~ '^[0-9]+$'
        and (metadata ->> 'pages_processed')::numeric between 0 and 1000000
      )
    )
    check (
      not (metadata ? 'batches_processed')
      or (
        jsonb_typeof(metadata -> 'batches_processed') = 'number'
        and metadata ->> 'batches_processed' ~ '^[0-9]+$'
        and (metadata ->> 'batches_processed')::numeric between 0 and 1000000
      )
    )
    check (
      not (metadata ? 'batch_size')
      or (
        jsonb_typeof(metadata -> 'batch_size') = 'number'
        and metadata ->> 'batch_size' ~ '^[0-9]+$'
        and (metadata ->> 'batch_size')::numeric between 1 and 500
      )
    ),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    (range_start is null and range_end is null)
    or (range_start is not null and range_end is not null and range_end >= range_start)
  ),
  check (
    rows_upserted::bigint + rows_rejected::bigint <= rows_read::bigint
  ),
  check (completed_at is null or completed_at >= started_at),
  check (updated_at >= started_at),
  check (completed_at is null or updated_at >= completed_at),
  check (
    (outcome = 'running' and completed_at is null and error_code is null)
    or (outcome = 'succeeded' and completed_at is not null and error_code is null)
    or (outcome = 'failed' and completed_at is not null and error_code is not null)
  )
);

create index awin_sync_runs_type_started_idx
  on public.awin_sync_runs (sync_type, started_at desc);

alter table public.awin_transactions owner to postgres;
alter table public.awin_publisher_performance_daily owner to postgres;
alter table public.awin_sync_runs owner to postgres;

alter function public.guard_awin_transaction_deleted_status()
  owner to postgres;
alter function public.stamp_awin_import_lifecycle()
  owner to postgres;

alter table public.awin_transactions enable row level security;
alter table public.awin_publisher_performance_daily enable row level security;
alter table public.awin_sync_runs enable row level security;

revoke all on table public.awin_transactions from public, anon, authenticated, service_role;
revoke all on table public.awin_publisher_performance_daily from public, anon, authenticated, service_role;
revoke all on table public.awin_sync_runs from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.awin_transactions to service_role;
grant select, insert, update, delete on table public.awin_publisher_performance_daily to service_role;
grant select, insert, update, delete on table public.awin_sync_runs to service_role;

revoke all on function public.guard_awin_transaction_deleted_status()
  from public, anon, authenticated, service_role;
revoke all on function public.stamp_awin_import_lifecycle()
  from public, anon, authenticated, service_role;

create view public.awin_order_reconciliation_v
with (security_invoker = true)
as
with order_rollup as (
  select
    orders.stripe_payment_id,
    pg_catalog.count(*)::integer as order_count,
    case
      when pg_catalog.count(*) = 1
        then pg_catalog.min(orders.id::text)::uuid
      else null
    end as order_id,
    case
      when pg_catalog.count(*) = 1 then pg_catalog.min(orders.created_at)
      else null
    end as order_date,
    case
      when pg_catalog.count(*) = 1 then pg_catalog.min(orders.amount_pence)
      else null
    end as amount_pence
  from public.orders
  where orders.stripe_payment_id is not null
  group by orders.stripe_payment_id
),
transaction_rollup as (
  select
    imported.order_ref,
    pg_catalog.count(imported.awin_transaction_id)::integer
      as awin_transaction_count,
    pg_catalog.array_agg(
      imported.awin_transaction_id
      order by imported.awin_transaction_id
    ) as awin_transaction_ids,
    pg_catalog.array_agg(
      imported.sale_amount_pence
      order by imported.awin_transaction_id
    ) as awin_sale_amounts_pence,
    pg_catalog.array_agg(
      imported.currency
      order by imported.awin_transaction_id
    ) as awin_currencies,
    pg_catalog.array_agg(
      distinct imported.publisher_id
      order by imported.publisher_id
    ) filter (where imported.publisher_id is not null) as publisher_ids,
    pg_catalog.array_agg(
      distinct imported.status
      order by imported.status
    ) as awin_statuses,
    pg_catalog.array_agg(
      distinct imported.commission_group
      order by imported.commission_group
    ) filter (where imported.commission_group is not null)
      as awin_commission_groups,
    pg_catalog.array_agg(
      distinct imported.voucher_code
      order by imported.voucher_code
    ) filter (where imported.voucher_code is not null)
      as awin_voucher_codes,
    pg_catalog.sum(imported.commission_pence) as actual_commission_pence,
    case
      when pg_catalog.count(imported.awin_transaction_id)
        filter (where imported.network_fee_pence is null) > 0
        then null
      else pg_catalog.sum(imported.network_fee_pence)
    end as actual_network_fee_pence,
    pg_catalog.max(imported.last_synced_at) as last_synced_at
  from public.awin_transactions as imported
  where imported.order_ref is not null
  group by imported.order_ref
),
publisher_summary as (
  select
    transaction_rollup.order_ref,
    pg_catalog.array_agg(
      publisher.publisher_name
      order by publisher.publisher_name
    ) filter (where publisher.publisher_name is not null) as publisher_names
  from transaction_rollup
  cross join lateral pg_catalog.unnest(transaction_rollup.publisher_ids)
    as observed_publisher(publisher_id)
  left join public.awin_publishers as publisher
    on publisher.publisher_id = observed_publisher.publisher_id
  group by transaction_rollup.order_ref
),
reconciliation_refs as (
  select eligible.order_ref
  from public.awin_conversion_outbox as eligible
  union
  select transaction_rollup.order_ref
  from transaction_rollup
)
select
  pg_catalog.md5(reference.order_ref) as order_reference_key,
  coalesce(canonical_order.id, raw_order.order_id) as order_id,
  coalesce(canonical_order.created_at, raw_order.order_date)
    as order_date,
  coalesce(raw_order.order_count, 0) as solum_order_match_count,
  coalesce(raw_order.order_count, 0) > 0
    as solum_order_present,
  outbox.id is not null as commission_basis_present,
  coalesce(transaction_rollup.awin_transaction_count, 0)
    as awin_transaction_count,
  coalesce(
    transaction_rollup.awin_transaction_ids,
    array[]::text[]
  ) as awin_transaction_ids,
  coalesce(
    transaction_rollup.publisher_ids,
    array[]::bigint[]
  ) as publisher_ids,
  coalesce(
    publisher_summary.publisher_names,
    array[]::text[]
  ) as publisher_names,
  coalesce(
    transaction_rollup.awin_statuses,
    array[]::text[]
  ) as awin_statuses,
  coalesce(
    transaction_rollup.awin_commission_groups,
    array[]::text[]
  ) as awin_commission_groups,
  coalesce(canonical_order.amount_pence, raw_order.amount_pence)
    as solum_customer_paid_pence,
  outbox.customer_paid_pence as outbox_customer_paid_pence,
  outbox.discount_pence,
  outbox.delivery_pence,
  outbox.vat_pence,
  outbox.amount_pence as commissionable_amount_pence,
  outbox.currency as commissionable_currency,
  transaction_rollup.awin_sale_amounts_pence,
  transaction_rollup.awin_currencies,
  transaction_rollup.actual_commission_pence,
  transaction_rollup.actual_network_fee_pence,
  outbox.voucher_code,
  coalesce(
    transaction_rollup.awin_voucher_codes,
    array[]::text[]
  ) as awin_voucher_codes,
  outbox.state as conversion_delivery_state,
  outbox.provider_batch_accepted_at,
  outbox.sent_at as conversion_sent_at,
  transaction_rollup.last_synced_at,
  case
    when outbox.id is null
      and transaction_rollup.awin_transaction_count > 0
      then 'awin_only'
    when transaction_rollup.awin_transaction_count > 1
      then 'duplicate_order_ref'
    when coalesce(transaction_rollup.awin_transaction_count, 0) = 0
      and pg_catalog.clock_timestamp() < coalesce(
        outbox.sent_at,
        outbox.provider_batch_accepted_at,
        outbox.created_at
      ) + interval '30 minutes'
      then 'awaiting_network'
    when coalesce(transaction_rollup.awin_transaction_count, 0) = 0
      then 'solum_only'
    when (transaction_rollup.awin_currencies)[1]
      is distinct from outbox.currency
      then 'currency_mismatch'
    when (transaction_rollup.awin_sale_amounts_pence)[1]
      is distinct from outbox.amount_pence
      then 'value_mismatch'
    else 'matched'
  end as reconciliation_state
from reconciliation_refs as reference
left join transaction_rollup
  on transaction_rollup.order_ref = reference.order_ref
left join publisher_summary
  on publisher_summary.order_ref = reference.order_ref
left join order_rollup as raw_order
  on raw_order.stripe_payment_id = reference.order_ref
left join public.awin_conversion_outbox as outbox
  on outbox.order_ref = reference.order_ref
left join public.orders as canonical_order
  on canonical_order.id = outbox.order_id
  and canonical_order.stripe_payment_id = outbox.order_ref;

alter view public.awin_order_reconciliation_v owner to postgres;

revoke all on table public.awin_order_reconciliation_v
  from public, anon, authenticated, service_role;
grant select on table public.awin_order_reconciliation_v to service_role;

create or replace function public.resolve_awin_accepted_batches(
  p_limit integer
)
returns table (
  processed integer,
  sent integer,
  rescheduled integer,
  timed_out integer,
  duplicate integer
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception using
      errcode = '22023',
      message = 'p_limit must be between 1 and 500';
  end if;

  return query
  with resolution_clock as materialized (
    select pg_catalog.clock_timestamp() as resolved_at
  ),
  candidates as materialized (
    select
      candidate.id,
      candidate.order_ref,
      candidate.provider_batch_accepted_at,
      candidate.next_reconcile_at,
      candidate.created_at
    from public.awin_conversion_outbox as candidate
    cross join resolution_clock
    where candidate.state = 'processing'
      and candidate.provider_batch_id is not null
      and candidate.provider_batch_accepted_at is not null
      and candidate.next_reconcile_at is not null
      and candidate.next_reconcile_at <= resolution_clock.resolved_at
    order by
      candidate.next_reconcile_at,
      candidate.provider_batch_accepted_at,
      candidate.created_at,
      candidate.id
    for update of candidate skip locked
    limit p_limit
  ),
  transaction_matches as (
    select
      candidates.id,
      pg_catalog.count(imported.awin_transaction_id)::integer as match_count,
      pg_catalog.min(imported.awin_transaction_id) as awin_transaction_id
    from candidates
    left join public.awin_transactions as imported
      on imported.order_ref = candidates.order_ref
    group by candidates.id
  ),
  resolved as (
    update public.awin_conversion_outbox as outbox
    set
      state = case
        when transaction_matches.match_count = 1 then 'sent'
        when transaction_matches.match_count > 1 then 'dead_letter'
        when resolution_clock.resolved_at >=
          candidates.provider_batch_accepted_at + interval '24 hours'
          then 'dead_letter'
        else 'processing'
      end,
      next_attempt_at = null,
      next_reconcile_at = case
        when transaction_matches.match_count = 0
          and resolution_clock.resolved_at <
            candidates.provider_batch_accepted_at + interval '24 hours'
          then resolution_clock.resolved_at + interval '30 minutes'
        else null
      end,
      provider_transaction_id = case
        when transaction_matches.match_count = 1
          then transaction_matches.awin_transaction_id
        else outbox.provider_transaction_id
      end,
      sent_at = case
        when transaction_matches.match_count = 1
          then coalesce(
            outbox.sent_at,
            resolution_clock.resolved_at
          )
        else outbox.sent_at
      end,
      last_error_code = case
        when transaction_matches.match_count > 1
          then 'AWIN_DUPLICATE_ORDER_REF'
        when transaction_matches.match_count = 0
          and resolution_clock.resolved_at >=
            candidates.provider_batch_accepted_at + interval '24 hours'
          then 'AWIN_RECONCILIATION_TIMEOUT'
        when transaction_matches.match_count = 1 then null
        else outbox.last_error_code
      end,
      worker_id = null,
      lease_expires_at = null,
      updated_at = resolution_clock.resolved_at
    from candidates
    join transaction_matches
      on transaction_matches.id = candidates.id
    cross join resolution_clock
    where outbox.id = candidates.id
    returning
      transaction_matches.match_count,
      candidates.provider_batch_accepted_at,
      resolution_clock.resolved_at
  )
  select
    pg_catalog.count(*)::integer as processed,
    pg_catalog.count(*) filter (where resolved.match_count = 1)::integer
      as sent,
    pg_catalog.count(*) filter (
      where resolved.match_count = 0
        and resolved.resolved_at <
          resolved.provider_batch_accepted_at + interval '24 hours'
    )::integer as rescheduled,
    pg_catalog.count(*) filter (
      where resolved.match_count = 0
        and resolved.resolved_at >=
          resolved.provider_batch_accepted_at + interval '24 hours'
    )::integer as timed_out,
    pg_catalog.count(*) filter (where resolved.match_count > 1)::integer
      as duplicate
  from resolved;
end;
$$;

alter function public.resolve_awin_accepted_batches(integer)
  owner to postgres;
revoke all on function public.resolve_awin_accepted_batches(integer)
  from public, anon, authenticated, service_role;
grant execute on function public.resolve_awin_accepted_batches(integer)
  to service_role;
