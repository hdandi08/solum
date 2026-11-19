-- DEV rollout only. Enables no feature flags and never changes sellable counts.
-- Legacy single-kit resources remain compatible with the reservation worker.

alter table public.orders
  add column checkout_version text,
  add column kit_quantity integer not null default 1,
  add column shipping_address jsonb,
  add column currency text not null default 'gbp',
  add column inventory_reconciliation_required boolean not null default false,
  add constraint orders_checkout_shape check (case
    when checkout_version is null then kit_quantity=1
    when checkout_version='multi_kit_v1' then kit_quantity between 2 and 5 and kit_id is null
    else false end);

create table public.checkout_multi_attempts (
  id uuid primary key default gen_random_uuid(),
  request_key text not null unique,
  stripe_customer_id text not null,
  items jsonb not null check(jsonb_typeof(items)='array'),
  total_quantity integer not null check(total_quantity between 2 and 5),
  amount_pence integer not null check(amount_pence>0),
  created_at timestamptz not null default now(),
  stripe_payment_id text unique
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kit_id text not null references public.kit_inventory(kit_id),
  quantity integer not null check(quantity between 1 and 5),
  unit_amount_pence integer not null check(unit_amount_pence>0),
  line_amount_pence integer not null check(line_amount_pence=quantity*unit_amount_pence),
  refunded_quantity integer not null default 0 check(refunded_quantity between 0 and quantity),
  unique(order_id,kit_id)
);
create table public.order_fulfillment_units (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  kit_id text not null references public.kit_inventory(kit_id),
  unit_number integer not null check(unit_number between 1 and 5),
  status text not null default 'pending' check(status in ('pending','cancelled')),
  unique(order_item_id,unit_number)
);
-- Component bookkeeping cannot veto an already-paid order whose sellable kit
-- stock was reserved. Persist any shortfall explicitly instead of losing it to
-- a floor-at-zero update or failing order creation after taking payment.
create table public.order_component_allocations (
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  required_quantity integer not null check(required_quantity>0),
  deducted_quantity integer not null check(deducted_quantity>=0),
  shortfall_quantity integer not null check(shortfall_quantity>=0),
  restored_quantity integer not null default 0 check(restored_quantity between 0 and deducted_quantity),
  check(required_quantity=deducted_quantity+shortfall_quantity),
  primary key(order_id,product_id)
);
alter table public.checkout_reservations alter column kit_id drop not null;
alter table public.checkout_reservations add column items_snapshot jsonb;
alter table public.checkout_reservations add constraint checkout_reservation_shape check (
  (items_snapshot is null and kit_id is not null) or
  (items_snapshot is not null and kit_id is null and jsonb_typeof(items_snapshot)='array')
);

alter table public.checkout_multi_attempts enable row level security;
alter table public.order_items enable row level security;
alter table public.order_fulfillment_units enable row level security;
alter table public.order_component_allocations enable row level security;
revoke all on public.checkout_multi_attempts,public.order_items,public.order_fulfillment_units,public.order_component_allocations from public,anon,authenticated;
grant select,insert,update,delete on public.checkout_multi_attempts,public.order_items,public.order_fulfillment_units,public.order_component_allocations to service_role;

create function public.prepare_multi_kit_attempt(p_request_key text,p_items jsonb,p_stripe_customer_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; q numeric; total integer; amount integer; canonical jsonb; a public.checkout_multi_attempts%rowtype;
begin
  if p_request_key is null or length(p_request_key) not between 16 and 200 or p_stripe_customer_id is null or p_stripe_customer_id not like 'cus_%' then
    raise exception 'invalid_checkout_attempt';
  end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 10 then raise exception 'invalid_order_items'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item)<>'object' or item->>'kit_id' is null or item->>'kit_id' not in ('ground','ritual') or jsonb_typeof(item->'quantity') is distinct from 'number' then raise exception 'invalid_order_items'; end if;
    q:=(item->>'quantity')::numeric;
    if q<>trunc(q) or q<1 or q>5 then raise exception 'invalid_quantity'; end if;
  end loop;
  select sum((value->>'quantity')::integer) into total from jsonb_array_elements(p_items);
  if total not between 2 and 5 then raise exception 'invalid_order_quantity'; end if;
  select jsonb_agg(jsonb_build_object('kit_id',kit,'quantity',qty,'unit_amount_pence',unit,'line_amount_pence',qty*unit) order by kit),sum(qty*unit)
    into canonical,amount
    from (select value->>'kit_id' kit,sum((value->>'quantity')::integer)::integer qty,
      case value->>'kit_id' when 'ground' then 6500 else 8500 end unit
      from jsonb_array_elements(p_items) group by value->>'kit_id') normalized;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_key,8));
  select * into a from public.checkout_multi_attempts where request_key=p_request_key for update;
  if found then
    if a.items<>canonical then raise exception 'checkout_attempt_mismatch'; end if;
    if a.created_at<now()-interval '24 hours' then raise exception 'reservation_expired'; end if;
  else
    insert into public.checkout_multi_attempts(request_key,stripe_customer_id,items,total_quantity,amount_pence)
    values(p_request_key,p_stripe_customer_id,canonical,total,amount) returning * into a;
  end if;
  return to_jsonb(a);
end $$;

create function public.reserve_multi_kit_stock(p_attempt_id uuid,p_resource_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.checkout_multi_attempts%rowtype; r public.checkout_reservations%rowtype; item jsonb; n integer;
begin
  if p_resource_id is null or p_resource_id not like 'pi_%' then raise exception 'invalid_payment_resource'; end if;
  select * into a from public.checkout_multi_attempts where id=p_attempt_id for update;
  if not found then raise exception 'checkout_attempt_missing'; end if;
  if a.stripe_payment_id is not null and a.stripe_payment_id<>p_resource_id then raise exception 'checkout_attempt_resource_mismatch'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_resource_id,1));
  select * into r from public.checkout_reservations where resource_id=p_resource_id for update;
  if found then
    if r.resource_kind<>'payment_intent' or r.items_snapshot is distinct from a.items then raise exception 'reservation_resource_mismatch'; end if;
    return jsonb_build_object('state',r.state,'expires_at',r.expires_at);
  end if;
  if a.created_at<now()-interval '24 hours' then raise exception 'reservation_expired'; end if;
  -- Lock every stock row in deterministic order before changing any count.
  for item in select value from jsonb_array_elements(a.items) order by value->>'kit_id' loop
    select available_count into n from public.kit_inventory where kit_id=item->>'kit_id' for update;
    if not found then raise exception 'inventory_unavailable'; end if;
    if n<(item->>'quantity')::integer then
      return jsonb_build_object('state','sold_out','kit_id',item->>'kit_id','available_count',n);
    end if;
  end loop;
  insert into public.checkout_reservations(resource_id,resource_kind,kit_id,items_snapshot)
  values(p_resource_id,'payment_intent',null,a.items) returning * into r;
  update public.checkout_multi_attempts set stripe_payment_id=p_resource_id where id=a.id;
  for item in select value from jsonb_array_elements(a.items) order by value->>'kit_id' loop
    update public.kit_inventory set available_count=available_count-(item->>'quantity')::integer,updated_at=now() where kit_id=item->>'kit_id';
  end loop;
  return jsonb_build_object('state',r.state,'expires_at',r.expires_at);
end $$;

create or replace function public.settle_checkout_reservation(p_resource_id text,p_outcome text)
returns text language plpgsql security definer set search_path='' as $$
declare r public.checkout_reservations%rowtype; item jsonb;
begin
  if p_outcome is null or p_outcome not in ('consumed','released') then raise exception 'invalid_reservation_outcome'; end if;
  select * into r from public.checkout_reservations where resource_id=p_resource_id for update;
  if not found then raise exception 'reservation_missing'; end if;
  if r.state='released' and p_outcome='consumed' then raise exception 'paid_reservation_was_released'; end if;
  if r.state<>'held' then return r.state; end if;
  if p_outcome='released' then
    if r.items_snapshot is null then
      update public.kit_inventory set available_count=available_count+1,updated_at=now() where kit_id=r.kit_id;
      if not found then raise exception 'inventory_unavailable'; end if;
    else
      for item in select value from jsonb_array_elements(r.items_snapshot) order by value->>'kit_id' loop
        update public.kit_inventory set available_count=available_count+(item->>'quantity')::integer,updated_at=now() where kit_id=item->>'kit_id';
        if not found then raise exception 'inventory_unavailable'; end if;
      end loop;
    end if;
  end if;
  update public.checkout_reservations set state=p_outcome,updated_at=now() where resource_id=r.resource_id;
  return p_outcome;
end $$;

create or replace function public.restock_checkout_inventory(p_order_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; item record; allocation record;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'inventory_order_missing'; end if;
  if o.order_type<>'first_box' or not o.inventory_kit_deducted or o.inventory_kit_restocked then return; end if;
  if o.checkout_version='multi_kit_v1' then
    -- A financial refund alone is never proof that shipped goods returned.
    if o.dispatch_status<>'pending' or o.sendcloud_parcel_id is not null or
      exists(select 1 from public.order_fulfillment_units where order_id=o.id and status<>'pending') then return; end if;
    for item in select * from public.order_items where order_id=o.id order by kit_id loop
      update public.kit_inventory set available_count=available_count+item.quantity,updated_at=now() where kit_id=item.kit_id;
      if not found then raise exception 'inventory_unavailable'; end if;
    end loop;
    for allocation in select * from public.order_component_allocations where order_id=o.id order by product_id for update loop
      if allocation.deducted_quantity>allocation.restored_quantity then
        update public.products set current_stock=current_stock+allocation.deducted_quantity-allocation.restored_quantity where id=allocation.product_id;
        insert into public.inventory_transactions(product_id,transaction_type,quantity,reference_type,reference_id,notes)
        values(allocation.product_id,'adjustment',allocation.deducted_quantity-allocation.restored_quantity,'order',o.id::text,'Multi-kit unshipped cancellation: restore recorded component stock');
      end if;
      update public.order_component_allocations set restored_quantity=deducted_quantity where order_id=o.id and product_id=allocation.product_id;
    end loop;
    update public.order_items set refunded_quantity=quantity where order_id=o.id;
    update public.order_fulfillment_units set status='cancelled' where order_id=o.id;
  else
    update public.kit_inventory set available_count=available_count+1,updated_at=now() where kit_id=o.kit_id;
    if not found then raise exception 'inventory_unavailable'; end if;
  end if;
  update public.orders set inventory_kit_restocked=true where id=o.id;
end $$;

create function public.finalise_multi_kit_order(p_attempt_id uuid,p_payment_id text,p_customer_id uuid,p_amount_pence integer,p_address jsonb,p_source text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.checkout_multi_attempts%rowtype; r public.checkout_reservations%rowtype;
  o public.orders%rowtype; item jsonb; line_id uuid; component record; stock integer; taken integer;
  key text; address jsonb; early_refund boolean;
begin
  if p_payment_id is null or p_payment_id not like 'pi_%' then raise exception 'invalid_payment_resource'; end if;
  -- Share the existing full-refund namespace so refund-before-order races settle.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_payment_id,2));
  select * into a from public.checkout_multi_attempts where id=p_attempt_id for update;
  if not found then raise exception 'checkout_attempt_missing'; end if;
  if a.stripe_payment_id is distinct from p_payment_id or a.amount_pence is distinct from p_amount_pence then raise exception 'checkout_payment_mismatch'; end if;
  if not exists(select 1 from public.customers where id=p_customer_id and stripe_customer_id=a.stripe_customer_id) then raise exception 'checkout_customer_mismatch'; end if;
  select * into o from public.orders where stripe_payment_id=p_payment_id and order_type='first_box' for update;
  if found then
    if o.checkout_version is distinct from 'multi_kit_v1' or o.customer_id<>p_customer_id or o.amount_pence<>a.amount_pence then raise exception 'checkout_order_mismatch'; end if;
    return jsonb_build_object('id',o.id,'created_at',o.created_at,'customer_id',o.customer_id,'items',a.items,'total_quantity',a.total_quantity,'amount_pence',a.amount_pence,'shipping_address',o.shipping_address);
  end if;
  if p_address is null or jsonb_typeof(p_address)<>'object' then raise exception 'invalid_shipping_address'; end if;
  foreach key in array array['name','line1','city','postcode','country'] loop
    if jsonb_typeof(p_address->key) is distinct from 'string' or length(btrim(p_address->>key)) not between 1 and 250 then raise exception 'invalid_shipping_address'; end if;
  end loop;
  if p_address->>'country'<>'GB' then raise exception 'invalid_shipping_address'; end if;
  address:=jsonb_build_object('name',p_address->>'name','line1',p_address->>'line1','line2',p_address->>'line2','city',p_address->>'city','postcode',p_address->>'postcode','country','GB','phone',p_address->>'phone');
  select * into r from public.checkout_reservations where resource_id=p_payment_id for update;
  if not found or r.items_snapshot is distinct from a.items or r.resource_kind<>'payment_intent' then raise exception 'reservation_order_mismatch'; end if;
  if r.state='released' then raise exception 'paid_reservation_was_released'; end if;
  if r.order_id is not null then raise exception 'reservation_order_mismatch'; end if;
  early_refund:=exists(select 1 from public.checkout_full_refunds where payment_id=p_payment_id);
  insert into public.orders(customer_id,subscription_id,stripe_payment_id,kit_id,order_type,box_number,amount_pence,status,source,checkout_version,kit_quantity,shipping_address,currency,inventory_kit_deducted)
  values(p_customer_id,null,p_payment_id,null,'first_box',null,a.amount_pence,'paid',p_source,'multi_kit_v1',a.total_quantity,address,'gbp',true) returning * into o;
  for item in select value from jsonb_array_elements(a.items) order by value->>'kit_id' loop
    insert into public.order_items(order_id,kit_id,quantity,unit_amount_pence,line_amount_pence)
    values(o.id,item->>'kit_id',(item->>'quantity')::integer,(item->>'unit_amount_pence')::integer,(item->>'line_amount_pence')::integer) returning id into line_id;
    insert into public.order_fulfillment_units(order_id,order_item_id,kit_id,unit_number)
      select o.id,line_id,item->>'kit_id',number from generate_series(1,(item->>'quantity')::integer) number;
  end loop;
  if not early_refund then
    for component in
      select kp.product_id,sum(kp.first_box_qty*(item.value->>'quantity')::integer)::integer qty
      from jsonb_array_elements(a.items) item
      join public.kit_products kp on kp.kit_id=item.value->>'kit_id'
      where kp.first_box_qty>0 group by kp.product_id order by kp.product_id
    loop
      select current_stock into stock from public.products where id=component.product_id for update;
      if not found then raise exception 'component_configuration_missing'; end if;
      taken:=least(stock,component.qty);
      if taken>0 then
        update public.products set current_stock=current_stock-taken where id=component.product_id;
        insert into public.inventory_transactions(product_id,transaction_type,quantity,reference_type,reference_id,notes)
        values(component.product_id,'outbound_order',-taken,'order',o.id::text,'Multi-kit paid order: component consumption');
      end if;
      insert into public.order_component_allocations(order_id,product_id,required_quantity,deducted_quantity,shortfall_quantity)
      values(o.id,component.product_id,component.qty,taken,component.qty-taken);
    end loop;
    update public.orders set inventory_reconciliation_required=
      exists(select 1 from public.order_component_allocations where order_id=o.id and shortfall_quantity>0) or
      exists(select 1 from jsonb_array_elements(a.items) item where not exists(select 1 from public.kit_products kp where kp.kit_id=item.value->>'kit_id' and kp.first_box_qty>0))
      where id=o.id;
  end if;
  update public.checkout_reservations set state='consumed',order_id=o.id,updated_at=now() where resource_id=r.resource_id;
  if early_refund then
    perform public.restock_checkout_inventory(o.id);
    update public.orders set status='refunded' where id=o.id;
  end if;
  return jsonb_build_object('id',o.id,'created_at',o.created_at,'customer_id',o.customer_id,'items',a.items,'total_quantity',a.total_quantity,'amount_pence',a.amount_pence,'shipping_address',address);
end $$;

create function public.guard_multi_kit_order()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and old.checkout_version='multi_kit_v1' and new.checkout_version is distinct from old.checkout_version then raise exception 'multi_kit_order_snapshot_immutable'; end if;
  if new.kit_quantity>1 or new.checkout_version='multi_kit_v1' then
    if new.dispatch_status<>'pending' or new.sendcloud_parcel_id is not null or new.tracking_number is not null or new.dispatched_at is not null then
      raise exception 'multi_kit_fulfillment_pending';
    end if;
    if tg_op='UPDATE' and old.checkout_version='multi_kit_v1' and (
      new.shipping_address is distinct from old.shipping_address or new.amount_pence is distinct from old.amount_pence or
      new.kit_quantity is distinct from old.kit_quantity or new.stripe_payment_id is distinct from old.stripe_payment_id or
      new.customer_id is distinct from old.customer_id or new.currency is distinct from old.currency
    ) then raise exception 'multi_kit_order_snapshot_immutable'; end if;
  end if;
  return new;
end $$;
create trigger multi_kit_order_fulfillment_guard before insert or update on public.orders
for each row execute function public.guard_multi_kit_order();

revoke all on function public.prepare_multi_kit_attempt(text,jsonb,text) from public,anon,authenticated;
revoke all on function public.reserve_multi_kit_stock(uuid,text) from public,anon,authenticated;
revoke all on function public.finalise_multi_kit_order(uuid,text,uuid,integer,jsonb,text) from public,anon,authenticated;
revoke all on function public.settle_checkout_reservation(text,text) from public,anon,authenticated;
revoke all on function public.restock_checkout_inventory(uuid) from public,anon,authenticated;
grant execute on function public.prepare_multi_kit_attempt(text,jsonb,text) to service_role;
grant execute on function public.reserve_multi_kit_stock(uuid,text) to service_role;
grant execute on function public.finalise_multi_kit_order(uuid,text,uuid,integer,jsonb,text) to service_role;
grant execute on function public.settle_checkout_reservation(text,text) to service_role;
grant execute on function public.restock_checkout_inventory(uuid) to service_role;

-- Preserve audited manual actions while explaining the deferred fulfillment guard.
create or replace function public.admin_mutate_order(
  p_order_id uuid,
  p_action text,
  p_tracking_number text,
  p_carrier text,
  p_actor_user_id uuid,
  p_actor_email text,
  p_environment text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_error_code text;
  v_error_message text;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    insert into public.admin_audit_events (
      request_id,
      actor_user_id,
      actor_email,
      environment,
      action,
      target_type,
      target_id,
      status,
      error_code,
      completed_at
    ) values (
      p_request_id,
      p_actor_user_id,
      p_actor_email,
      p_environment,
      'order.' || p_action,
      'order',
      p_order_id::text,
      'failed',
      'ORDER_NOT_FOUND',
      now()
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'ORDER_NOT_FOUND',
      'message', 'Order was not found.'
    );
  end if;

  v_before := jsonb_build_object(
    'dispatch_status', v_order.dispatch_status,
    'tracking_number', v_order.tracking_number,
    'carrier', v_order.carrier
  );

  if v_order.kit_quantity > 1 then
    v_error_code := 'MULTI_KIT_FULFILLMENT_PENDING';
    v_error_message := 'Multi-kit orders need separate parcel handling. Fulfillment is not enabled yet.';
  elsif p_action = 'dispatch' then
    if v_order.dispatch_status <> 'pending' then
      v_error_code := 'INVALID_TRANSITION';
      v_error_message := 'Only pending orders can be dispatched.';
    elsif p_carrier not in (
      'royal-mail',
      'evri',
      'dpd',
      'dhl',
      'parcelforce',
      'other'
    ) then
      v_error_code := 'VALIDATION_FAILED';
      v_error_message := 'Carrier is invalid.';
    elsif p_tracking_number is null
      or length(trim(p_tracking_number)) = 0
      or length(trim(p_tracking_number)) > 100
    then
      v_error_code := 'VALIDATION_FAILED';
      v_error_message := 'Tracking number is invalid.';
    end if;
  elsif p_action = 'deliver' then
    if v_order.dispatch_status <> 'dispatched' then
      v_error_code := 'INVALID_TRANSITION';
      v_error_message := 'Order must be dispatched before delivery.';
    end if;
  elsif p_action = 'reset_pending' then
    if v_order.dispatch_status <> 'dispatched' then
      v_error_code := 'INVALID_TRANSITION';
      v_error_message := 'Only dispatched orders can be reset to pending.';
    end if;
  else
    v_error_code := 'VALIDATION_FAILED';
    v_error_message := 'Order action is invalid.';
  end if;

  if v_error_code is not null then
    insert into public.admin_audit_events (
      request_id,
      actor_user_id,
      actor_email,
      environment,
      action,
      target_type,
      target_id,
      status,
      before_state,
      error_code,
      completed_at
    ) values (
      p_request_id,
      p_actor_user_id,
      p_actor_email,
      p_environment,
      'order.' || p_action,
      'order',
      p_order_id::text,
      'failed',
      v_before,
      v_error_code,
      now()
    );

    return jsonb_build_object(
      'ok', false,
      'code', v_error_code,
      'message', v_error_message
    );
  end if;

  if p_action = 'dispatch' then
    update public.orders
    set
      dispatch_status = 'dispatched',
      tracking_number = trim(p_tracking_number),
      carrier = p_carrier,
      dispatched_at = now()
    where id = p_order_id
    returning * into v_order;
  elsif p_action = 'deliver' then
    update public.orders
    set dispatch_status = 'delivered'
    where id = p_order_id
    returning * into v_order;
  else
    update public.orders
    set
      dispatch_status = 'pending',
      tracking_number = null,
      carrier = 'royal-mail',
      dispatched_at = null
    where id = p_order_id
    returning * into v_order;
  end if;

  v_after := jsonb_build_object(
    'dispatch_status', v_order.dispatch_status,
    'tracking_number', v_order.tracking_number,
    'carrier', v_order.carrier
  );

  insert into public.admin_audit_events (
    request_id,
    actor_user_id,
    actor_email,
    environment,
    action,
    target_type,
    target_id,
    status,
    before_state,
    after_state,
    completed_at
  ) values (
    p_request_id,
    p_actor_user_id,
    p_actor_email,
    p_environment,
    'order.' || p_action,
    'order',
    p_order_id::text,
    'succeeded',
    v_before,
    v_after,
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'order', jsonb_build_object(
      'id', v_order.id,
      'dispatch_status', v_order.dispatch_status,
      'tracking_number', v_order.tracking_number,
      'carrier', v_order.carrier,
      'dispatched_at', v_order.dispatched_at
    )
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'ok', false,
      'code', 'DUPLICATE_REQUEST',
      'message', 'This admin request was already processed.'
    );
  when others then
    begin
      insert into public.admin_audit_events (
        request_id,
        actor_user_id,
        actor_email,
        environment,
        action,
        target_type,
        target_id,
        status,
        before_state,
        error_code,
        completed_at
      ) values (
        p_request_id,
        p_actor_user_id,
        p_actor_email,
        p_environment,
        'order.' || coalesce(p_action, 'unknown'),
        'order',
        p_order_id::text,
        'failed',
        v_before,
        'ORDER_MUTATION_FAILED',
        now()
      )
      on conflict (request_id) do nothing;
    exception
      when others then null;
    end;

    return jsonb_build_object(
      'ok', false,
      'code', 'ORDER_MUTATION_FAILED',
      'message', 'Order could not be updated.'
    );
end;
$$;

revoke all on function public.admin_mutate_order(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.admin_mutate_order(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  uuid
) to service_role;
