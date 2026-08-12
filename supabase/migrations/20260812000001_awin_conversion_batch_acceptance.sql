-- A 202 only acknowledges AWIN's asynchronous batch. It is deliberately not
-- a sent conversion and may only be resolved by later transaction ingestion.
alter table public.awin_conversion_outbox
  add column next_reconcile_at timestamptz,
  add column provider_batch_accepted_at timestamptz;

alter table public.awin_conversion_outbox
  drop constraint awin_conversion_outbox_lease_state_check;

alter table public.awin_conversion_outbox
  add constraint awin_conversion_outbox_lease_state_check
    check (
      (
        state = 'processing'
        and (
          (
            provider_batch_id is null
            and next_reconcile_at is null
            and worker_id is not null
            and lease_expires_at is not null
          )
          or (
            provider_batch_id is not null
            and next_reconcile_at is not null
            and worker_id is null
            and lease_expires_at is null
          )
        )
      )
      or (
        state <> 'processing'
        and worker_id is null
        and lease_expires_at is null
      )
    );

alter table public.awin_conversion_outbox
  add constraint awin_conversion_outbox_reconciliation_state_check
    check (
      (state = 'processing' and provider_batch_id is not null)
      = (next_reconcile_at is not null)
    );

alter table public.awin_conversion_outbox
  add constraint awin_conversion_outbox_provider_batch_accepted_check
    check (
      provider_batch_accepted_at is null
      or provider_batch_id is not null
    );

create index awin_conversion_outbox_reconciliation_due_idx
  on public.awin_conversion_outbox (next_reconcile_at, created_at, id)
  where state = 'processing'
    and provider_batch_id is not null
    and next_reconcile_at is not null;

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
        and candidate.provider_batch_id is null
        and candidate.next_reconcile_at is null
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
      next_reconcile_at = null,
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

alter function public.claim_awin_conversion_batch(integer, uuid, integer)
  owner to postgres;
revoke all on function public.claim_awin_conversion_batch(integer, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_awin_conversion_batch(integer, uuid, integer)
  to service_role;

create or replace function public.accept_awin_conversion_batch(
  p_id uuid,
  p_worker_id uuid,
  p_http_status integer,
  p_batch_id text,
  p_next_reconcile_at timestamptz
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
  if p_http_status is distinct from 202 then
    raise exception using
      errcode = '22023',
      message = 'p_http_status must be 202';
  end if;
  if p_batch_id is null
    or char_length(p_batch_id) < 1
    or char_length(p_batch_id) > 200
    or p_batch_id <> btrim(p_batch_id)
    or p_batch_id !~ '^[A-Za-z0-9._:-]+$'
  then
    raise exception using
      errcode = '22023',
      message = 'p_batch_id is invalid';
  end if;
  if p_next_reconcile_at is null
    or p_next_reconcile_at <= pg_catalog.clock_timestamp()
    or p_next_reconcile_at > pg_catalog.clock_timestamp() + interval '7 days'
  then
    raise exception using
      errcode = '22023',
      message = 'p_next_reconcile_at is outside the reconciliation window';
  end if;

  update public.awin_conversion_outbox as outbox
  set
    state = 'processing',
    next_attempt_at = null,
    next_reconcile_at = p_next_reconcile_at,
    last_http_status = p_http_status,
    last_error_code = null,
    provider_batch_id = p_batch_id,
    provider_batch_accepted_at = pg_catalog.statement_timestamp(),
    provider_transaction_id = null,
    worker_id = null,
    lease_expires_at = null,
    updated_at = pg_catalog.statement_timestamp()
  where outbox.id = p_id
    and outbox.state = 'processing'
    and outbox.worker_id = p_worker_id
    and outbox.lease_expires_at > pg_catalog.clock_timestamp()
    and outbox.provider_batch_id is null
    and outbox.next_reconcile_at is null;

  return found;
end;
$$;

alter function public.accept_awin_conversion_batch(uuid, uuid, integer, text, timestamptz)
  owner to postgres;
revoke all on function public.accept_awin_conversion_batch(uuid, uuid, integer, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.accept_awin_conversion_batch(uuid, uuid, integer, text, timestamptz)
  to service_role;
