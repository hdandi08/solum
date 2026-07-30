create table public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  actor_user_id uuid not null,
  actor_email text not null,
  environment text not null
    check (environment in ('production', 'development')),
  action text not null,
  target_type text not null,
  target_id text not null,
  status text not null
    check (status in ('pending', 'succeeded', 'failed')),
  before_state jsonb,
  after_state jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.admin_audit_events enable row level security;
revoke all on table public.admin_audit_events from public, anon, authenticated;

create index admin_audit_events_target_idx
  on public.admin_audit_events (target_type, target_id, created_at desc);

create index admin_audit_events_actor_idx
  on public.admin_audit_events (actor_user_id, created_at desc);

create or replace function public.guard_admin_audit_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'admin audit events cannot be deleted';
  end if;

  if old.status <> 'pending' then
    raise exception 'completed admin audit events are immutable';
  end if;

  if (
    new.id <> old.id
    or new.request_id <> old.request_id
    or new.actor_user_id <> old.actor_user_id
    or new.actor_email <> old.actor_email
    or new.environment <> old.environment
    or new.action <> old.action
    or new.target_type <> old.target_type
    or new.target_id <> old.target_id
    or new.before_state is distinct from old.before_state
    or new.created_at <> old.created_at
  ) then
    raise exception 'admin audit event identity is immutable';
  end if;

  if new.status not in ('succeeded', 'failed') or new.completed_at is null then
    raise exception 'admin audit event must complete once';
  end if;

  return new;
end;
$$;

create trigger guard_admin_audit_event_update
  before update or delete on public.admin_audit_events
  for each row execute function public.guard_admin_audit_event();

comment on table public.admin_audit_events is
  'Server-only lifecycle audit for SOLUM administrator mutations.';
