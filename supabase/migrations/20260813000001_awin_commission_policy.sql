create table public.awin_commission_groups (
  code text primary key check (code ~ '^[A-Z0-9_]{1,50}$'),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  description text,
  condition_summary text,
  active boolean not null default true,
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.awin_commission_rate_sets (
  rate_set_key text primary key check (rate_set_key ~ '^[a-z0-9][a-z0-9_-]{0,99}$'),
  source_id text,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  active boolean not null default true,
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.awin_commission_rate_values (
  rate_set_key text not null
    references public.awin_commission_rate_sets(rate_set_key),
  commission_group_code text not null
    references public.awin_commission_groups(code),
  commission_type text not null
    check (commission_type in ('percentage', 'fixed')),
  rate_bps integer check (rate_bps between 0 and 10000),
  fixed_amount_pence integer
    check (fixed_amount_pence between 0 and 2147483647),
  currency text,
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (rate_set_key, commission_group_code),
  check (
    (commission_type = 'percentage'
      and rate_bps is not null
      and fixed_amount_pence is null
      and currency is null)
    or
    (commission_type = 'fixed'
      and rate_bps is null
      and fixed_amount_pence is not null
      and currency = 'GBP')
  )
);

create table public.awin_publishers (
  publisher_id bigint primary key check (publisher_id > 0),
  publisher_name text not null
    check (
      publisher_name = btrim(publisher_name)
      and char_length(publisher_name) between 1 and 200
    ),
  primary_region text
    check (
      primary_region is null
      or (
        primary_region = btrim(primary_region)
        and char_length(primary_region) between 1 and 200
      )
    ),
  primary_type text
    check (
      primary_type is null
      or (
        primary_type = btrim(primary_type)
        and char_length(primary_type) between 1 and 200
      )
    ),
  category text not null
    check (
      category in (
        'editorial',
        'creator',
        'cashback_loyalty',
        'comparison',
        'subnetwork',
        'other'
      )
    ),
  relationship_status text not null
    check (relationship_status ~ '^[a-z][a-z0-9_]{0,49}$'),
  retain_protected boolean not null default false,
  commercial_tier text not null
    check (commercial_tier in ('standard', 'premium', 'externally_managed')),
  rate_source text not null
    check (
      rate_source in (
        'awin_assignment',
        'skimlinks_managed',
        'approved_exception'
      )
    ),
  commission_rate_set_key text
    references public.awin_commission_rate_sets(rate_set_key),
  exception_reason text
    check (
      exception_reason is null
      or (
        exception_reason = btrim(exception_reason)
        and char_length(exception_reason) between 1 and 1000
      )
    ),
  exception_approved_by text
    check (
      exception_approved_by is null
      or (
        exception_approved_by = btrim(exception_approved_by)
        and char_length(exception_approved_by) between 1 and 200
      )
    ),
  exception_approved_at timestamptz,
  awin_tags jsonb not null default '[]'::jsonb
    check (jsonb_typeof(awin_tags) = 'array'),
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (commercial_tier = 'premium'
      and exception_reason is not null
      and exception_approved_by is not null
      and exception_approved_at is not null
      and rate_source = 'approved_exception'
      and commission_rate_set_key is not null)
    or
    (commercial_tier <> 'premium'
      and exception_reason is null
      and exception_approved_by is null
      and exception_approved_at is null)
  )
);

create table public.awin_publisher_rate_assignments (
  publisher_id bigint not null
    references public.awin_publishers(publisher_id),
  rate_set_key text not null
    references public.awin_commission_rate_sets(rate_set_key),
  effective_from timestamptz not null,
  effective_to timestamptz,
  state text not null check (state in ('current', 'scheduled', 'historical')),
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (publisher_id, rate_set_key, effective_from),
  check (effective_to is null or effective_to > effective_from)
);

create unique index awin_publisher_rate_assignments_one_current_idx
  on public.awin_publisher_rate_assignments (publisher_id)
  where state = 'current';

create or replace function public.guard_awin_publisher_protection()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.publisher_id is distinct from new.publisher_id then
    raise exception using
      errcode = '22023',
      message = 'awin_publisher_id_is_immutable';
  end if;

  if old.retain_protected and not new.retain_protected then
    raise exception using
      errcode = '22023',
      message = 'awin_protected_publisher_cannot_be_unprotected';
  end if;

  return new;
end;
$$;

create trigger guard_awin_publisher_protection
before update on public.awin_publishers
for each row execute function public.guard_awin_publisher_protection();

create or replace function public.guard_awin_publisher_assignment_overlap()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(new.publisher_id);

  if tg_op = 'UPDATE' then
    if exists (
      select 1
      from public.awin_publisher_rate_assignments as existing
      where existing.publisher_id = new.publisher_id
        and (
          existing.publisher_id,
          existing.rate_set_key,
          existing.effective_from
        ) <> (
          old.publisher_id,
          old.rate_set_key,
          old.effective_from
        )
        and pg_catalog.tstzrange(
          existing.effective_from,
          existing.effective_to,
          '[)'
        ) && pg_catalog.tstzrange(
          new.effective_from,
          new.effective_to,
          '[)'
        )
    ) then
      raise exception using
        errcode = '23P01',
        message = 'awin_publisher_rate_assignment_overlap';
    end if;
  elsif exists (
    select 1
    from public.awin_publisher_rate_assignments as existing
    where existing.publisher_id = new.publisher_id
      and pg_catalog.tstzrange(
        existing.effective_from,
        existing.effective_to,
        '[)'
      ) && pg_catalog.tstzrange(
        new.effective_from,
        new.effective_to,
        '[)'
      )
  ) then
    raise exception using
      errcode = '23P01',
      message = 'awin_publisher_rate_assignment_overlap';
  end if;

  return new;
end;
$$;

create trigger guard_awin_publisher_assignment_overlap
before insert or update on public.awin_publisher_rate_assignments
for each row execute function public.guard_awin_publisher_assignment_overlap();

insert into public.awin_commission_groups (
  code,
  name,
  source_hash
)
values
  (
    'DEFAULT',
    'DEFAULT',
    '585ea6d58e1fcbbfbaf38d3b0eb1a9217f3a5c70c6617da4ead9c61b7719c187'
  ),
  (
    'PREMIUM',
    'PREMIUM',
    'cdcfb67126966309c2dcefee986e3b3c25d41d7a12075fb671ab54339f3fb06f'
  );

insert into public.awin_commission_rate_sets (
  rate_set_key,
  name,
  source_hash
)
values
  (
    'program-standard',
    'Program Standard Commission Rates',
    '6753418e9c6ebc0369d0240afa09279c3f78549771c611a8c6d5b4b42889b78e'
  ),
  (
    'solum-premium',
    'Solum Premium',
    'b306cc59dece2a23c3ad5cdc5313ce297742a6066ec87c3300b4bee144e8ccc5'
  );

insert into public.awin_commission_rate_values (
  rate_set_key,
  commission_group_code,
  commission_type,
  rate_bps,
  source_hash
)
values
  (
    'program-standard',
    'DEFAULT',
    'percentage',
    1000,
    'd288363bdb1cf6146331a2e44ef662f106cb8abe06f0a955622ba63a1235a85e'
  ),
  (
    'program-standard',
    'PREMIUM',
    'percentage',
    1500,
    '67c2a724d32eb6f2ea3de96757da5651a79b3928baf50067bdaecf6abc6e59ad'
  );

alter table public.awin_commission_groups owner to postgres;
alter table public.awin_commission_rate_sets owner to postgres;
alter table public.awin_commission_rate_values owner to postgres;
alter table public.awin_publishers owner to postgres;
alter table public.awin_publisher_rate_assignments owner to postgres;

alter function public.guard_awin_publisher_protection() owner to postgres;
alter function public.guard_awin_publisher_assignment_overlap() owner to postgres;

alter table public.awin_commission_groups enable row level security;
alter table public.awin_commission_rate_sets enable row level security;
alter table public.awin_commission_rate_values enable row level security;
alter table public.awin_publishers enable row level security;
alter table public.awin_publisher_rate_assignments enable row level security;

revoke all on table public.awin_commission_groups from public, anon, authenticated;
revoke all on table public.awin_commission_rate_sets from public, anon, authenticated;
revoke all on table public.awin_commission_rate_values from public, anon, authenticated;
revoke all on table public.awin_publishers from public, anon, authenticated;
revoke all on table public.awin_publisher_rate_assignments from public, anon, authenticated;

grant select, insert, update, delete on table public.awin_commission_groups to service_role;
grant select, insert, update, delete on table public.awin_commission_rate_sets to service_role;
grant select, insert, update, delete on table public.awin_commission_rate_values to service_role;
grant select, insert, update, delete on table public.awin_publishers to service_role;
grant select, insert, update, delete on table public.awin_publisher_rate_assignments to service_role;

revoke all on function public.guard_awin_publisher_protection() from public, anon, authenticated;
revoke all on function public.guard_awin_publisher_assignment_overlap() from public, anon, authenticated;
