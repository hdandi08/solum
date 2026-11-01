-- Durable retry context contains identifiers/timestamps only, no buyer details.
create table public.checkout_attempts (
  request_key text primary key,
  created_at timestamptz not null default now(),
  stripe_customer_id text
);
create table public.checkout_full_refunds (
  payment_id text primary key,
  created_at timestamptz not null default now()
);
create table public.checkout_subscription_links (
  payment_id text primary key,
  subscription_id text not null unique,
  created_at timestamptz not null default now()
);
alter table public.checkout_attempts enable row level security;
alter table public.checkout_full_refunds enable row level security;
alter table public.checkout_subscription_links enable row level security;
revoke all on public.checkout_attempts,public.checkout_full_refunds,public.checkout_subscription_links from public,anon,authenticated;
grant select,insert,update,delete on public.checkout_attempts,public.checkout_full_refunds,public.checkout_subscription_links to service_role;
create function public.prepare_checkout_attempt(p_key text,p_customer_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.checkout_attempts%rowtype;
begin
  insert into public.checkout_attempts(request_key,stripe_customer_id) values(p_key,p_customer_id)
  on conflict(request_key) do update set stripe_customer_id=coalesce(public.checkout_attempts.stripe_customer_id,excluded.stripe_customer_id)
  returning * into a;
  return jsonb_build_object('created_at',a.created_at,'customer_id',a.stripe_customer_id);
end $$;
revoke all on function public.prepare_checkout_attempt(text,text) from public,anon,authenticated;
grant execute on function public.prepare_checkout_attempt(text,text) to service_role;

create or replace function public.finalise_checkout_inventory(p_order_id uuid,p_resource_id text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype; r public.checkout_reservations%rowtype; payment text;
begin
  select stripe_payment_id into payment from public.orders where id=p_order_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(payment,2));
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.order_type<>'first_box' then raise exception 'invalid_inventory_order'; end if;
  if not o.inventory_kit_deducted then
    select * into r from public.checkout_reservations where resource_id=coalesce(p_resource_id,o.stripe_payment_id) for update;
    if found then
      if r.kit_id<>o.kit_id or (r.order_id is not null and r.order_id<>o.id) then raise exception 'reservation_order_mismatch'; end if;
      if r.state='released' then raise exception 'paid_reservation_was_released'; end if;
      update public.checkout_reservations set state='consumed',order_id=o.id,updated_at=now() where resource_id=r.resource_id;
    else
      update public.kit_inventory set available_count=greatest(0,available_count-1),updated_at=now() where kit_id=o.kit_id;
      if not found then raise exception 'inventory_unavailable'; end if;
    end if;
    update public.orders set inventory_kit_deducted=true where id=o.id;
  end if;
  if exists(select 1 from public.checkout_full_refunds where payment_id=payment) then
    perform public.restock_checkout_inventory(o.id);
    update public.orders set status='refunded' where id=o.id;
  end if;
end $$;

create function public.record_checkout_full_refund(p_payment_id text)
returns void language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype;
begin
  if p_payment_id is null or p_payment_id='' then raise exception 'missing_payment_id'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_payment_id,2));
  insert into public.checkout_full_refunds(payment_id) values(p_payment_id) on conflict do nothing;
  for o in select * from public.orders where stripe_payment_id=p_payment_id for update loop
    perform public.restock_checkout_inventory(o.id);
    update public.orders set status='refunded' where id=o.id;
  end loop;
end $$;
revoke all on function public.record_checkout_full_refund(text) from public,anon,authenticated;
grant execute on function public.record_checkout_full_refund(text) to service_role;
