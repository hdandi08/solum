-- Opt-in checkout holds. This migration does not enable reservations or reset stock.
create table public.checkout_reservations (
  resource_id text primary key,
  resource_kind text not null check (resource_kind in ('payment_intent','checkout_session')),
  kit_id text not null references public.kit_inventory(kit_id),
  state text not null default 'held' check (state in ('held','consumed','released')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 minutes'),
  updated_at timestamptz not null default now(),
  order_id uuid unique references public.orders(id) on delete set null,
  check ((resource_kind = 'payment_intent' and resource_id like 'pi_%') or
         (resource_kind = 'checkout_session' and resource_id like 'cs_%'))
);
alter table public.checkout_reservations enable row level security;
revoke all on public.checkout_reservations from public, anon, authenticated;
grant select, insert, update, delete on public.checkout_reservations to service_role;
create index checkout_reservations_expiry on public.checkout_reservations(expires_at) where state='held';

create function public.reserve_checkout_stock(p_kit_id text,p_resource_id text,p_resource_kind text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.checkout_reservations%rowtype; n integer;
begin
  -- Serialise retries for the same immutable Stripe resource before locking stock.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_resource_id, 1));
  select * into r from public.checkout_reservations where resource_id=p_resource_id;
  if found then
    if r.kit_id<>p_kit_id or r.resource_kind<>p_resource_kind then raise exception 'reservation_resource_mismatch'; end if;
    return jsonb_build_object('state',r.state,'expires_at',r.expires_at);
  end if;
  select available_count into n from public.kit_inventory where kit_id=p_kit_id for update;
  if not found then raise exception 'inventory_unavailable'; end if;
  if n<=0 then return jsonb_build_object('state','sold_out'); end if;
  insert into public.checkout_reservations(resource_id,resource_kind,kit_id)
    values(p_resource_id,p_resource_kind,p_kit_id) returning * into r;
  update public.kit_inventory set available_count=available_count-1,updated_at=now() where kit_id=p_kit_id;
  return jsonb_build_object('state',r.state,'expires_at',r.expires_at);
end $$;

-- Caller must first verify canceled/expired or paid status with Stripe.
-- A consumed reservation can never be released by a stale cleanup request.
create function public.settle_checkout_reservation(p_resource_id text,p_outcome text)
returns text language plpgsql security definer set search_path = '' as $$
declare r public.checkout_reservations%rowtype;
begin
  if p_outcome not in ('consumed','released') then raise exception 'invalid_reservation_outcome'; end if;
  select * into r from public.checkout_reservations where resource_id=p_resource_id for update;
  if not found then raise exception 'reservation_missing'; end if;
  if r.state='released' and p_outcome='consumed' then raise exception 'paid_reservation_was_released'; end if;
  if r.state<>'held' then return r.state; end if;
  if p_outcome='released' then
    update public.kit_inventory set available_count=available_count+1,updated_at=now() where kit_id=r.kit_id;
  end if;
  update public.checkout_reservations set state=p_outcome,updated_at=now() where resource_id=p_resource_id;
  return p_outcome;
end $$;

create function public.finalise_checkout_inventory(p_order_id uuid,p_resource_id text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype; r public.checkout_reservations%rowtype;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.order_type<>'first_box' then raise exception 'invalid_inventory_order'; end if;
  if o.inventory_kit_deducted then return; end if;
  select * into r from public.checkout_reservations
    where resource_id=coalesce(p_resource_id,o.stripe_payment_id) for update;
  if found then
    if r.kit_id<>o.kit_id or (r.order_id is not null and r.order_id<>o.id) then raise exception 'reservation_order_mismatch'; end if;
    if r.state='released' then raise exception 'paid_reservation_was_released'; end if;
    update public.checkout_reservations set state='consumed',order_id=o.id,updated_at=now() where resource_id=r.resource_id;
  else
    -- Compatibility for payments issued before activation. These remain a rollout
    -- risk, but flag+adjust is atomic and retries cannot decrement twice.
    update public.kit_inventory set available_count=greatest(0,available_count-1),updated_at=now() where kit_id=o.kit_id;
    if not found then raise exception 'inventory_unavailable'; end if;
  end if;
  update public.orders set inventory_kit_deducted=true where id=o.id;
end $$;

create function public.restock_checkout_inventory(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'inventory_order_missing'; end if;
  if o.order_type<>'first_box' or not o.inventory_kit_deducted or o.inventory_kit_restocked then return; end if;
  update public.kit_inventory set available_count=available_count+1,updated_at=now() where kit_id=o.kit_id;
  if not found then raise exception 'inventory_unavailable'; end if;
  update public.orders set inventory_kit_restocked=true where id=o.id;
end $$;

revoke all on function public.reserve_checkout_stock(text,text,text) from public,anon,authenticated;
revoke all on function public.settle_checkout_reservation(text,text) from public,anon,authenticated;
revoke all on function public.finalise_checkout_inventory(uuid,text) from public,anon,authenticated;
revoke all on function public.restock_checkout_inventory(uuid) from public,anon,authenticated;
grant execute on function public.reserve_checkout_stock(text,text,text) to service_role;
grant execute on function public.settle_checkout_reservation(text,text) to service_role;
grant execute on function public.finalise_checkout_inventory(uuid,text) to service_role;
grant execute on function public.restock_checkout_inventory(uuid) to service_role;
