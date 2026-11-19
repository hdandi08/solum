-- Run inside BEGIN/ROLLBACK, optionally immediately after the migration SQL.
-- Only unique fixture rows are created; real kit counts are never changed.
do $test$
declare tag text:=replace(gen_random_uuid()::text,'-','');
  g text; r text; wash text; oil text; customer uuid:=gen_random_uuid(); customer_ref text;
  canonical jsonb; again jsonb; snapshot jsonb; attempt uuid; attempt2 uuid; attempt3 uuid;
  payment text; payment2 text; payment3 text; result jsonb; oid uuid; amount integer;
  address jsonb:='{"name":"Fixture Buyer","line1":"1 Fixture Road","city":"London","postcode":"SW1A 1AA","country":"GB"}';
  rejected boolean; bad jsonb; role_name text;
begin
  g:='mk_'||tag||'_g'; r:='mk_'||tag||'_r'; wash:='mk_'||tag||'_wash'; oil:='mk_'||tag||'_oil'; customer_ref:='cus_mk_'||tag;
  payment:='pi_mk_'||tag||'_1';payment2:='pi_mk_'||tag||'_2';payment3:='pi_mk_'||tag||'_3';
  canonical:=public.prepare_multi_kit_attempt('mk_canonical_'||tag,'[{"kit_id":"ritual","quantity":1},{"kit_id":"ground","quantity":1},{"kit_id":"ritual","quantity":1}]',customer_ref);
  if (canonical->>'amount_pence')::integer<>23500 or (canonical->>'total_quantity')::integer<>3 or jsonb_array_length(canonical->'items')<>2 then raise exception 'TEST: canonical prices/normalization';end if;
  again:=public.prepare_multi_kit_attempt('mk_canonical_'||tag,'[{"kit_id":"ground","quantity":1},{"kit_id":"ritual","quantity":2}]','cus_other_fixture');
  if canonical->>'id'<>again->>'id' or again->>'stripe_customer_id'<>customer_ref then raise exception 'TEST: immutable retry/customer';end if;
  rejected:=false;
  begin perform public.prepare_multi_kit_attempt('mk_canonical_'||tag,'[{"kit_id":"ritual","quantity":2}]',customer_ref); exception when others then rejected:=sqlerrm='checkout_attempt_mismatch';end;
  if not rejected then raise exception 'TEST: attempt snapshot mutation accepted';end if;
  for bad in select value from jsonb_array_elements('[[],[{"kit_id":"ground","quantity":0}],[{"kit_id":"ground","quantity":-1}],[{"kit_id":"ground","quantity":1.5}],[{"kit_id":"ground","quantity":"2"}],[{"kit_id":"unknown","quantity":2}],[{"kit_id":"ground","quantity":3},{"kit_id":"ritual","quantity":3}]]') loop
    rejected:=false;
    begin perform public.prepare_multi_kit_attempt('mk_bad_'||tag,bad,customer_ref);exception when others then rejected:=true;end;
    if not rejected then raise exception 'TEST: invalid items accepted %',bad;end if;
  end loop;
  insert into public.customers(id,email,first_name,stripe_customer_id) values(customer,'multi-kit-'||tag||'@example.invalid','Fixture',customer_ref);
  insert into public.kit_inventory(kit_id,available_count) values(g,3),(r,3);
  insert into public.products(id,name,sku,current_stock) values(wash,'Fixture wash',wash,10),(oil,'Fixture oil',oil,10);
  insert into public.kit_products(kit_id,product_id,first_box_qty) values(g,wash,1),(r,wash,1),(r,oil,1);
  snapshot:=jsonb_build_array(jsonb_build_object('kit_id',g,'quantity',1,'unit_amount_pence',6500,'line_amount_pence',6500),jsonb_build_object('kit_id',r,'quantity',2,'unit_amount_pence',8500,'line_amount_pence',17000));
  insert into public.checkout_multi_attempts(request_key,stripe_customer_id,items,total_quantity,amount_pence)
    values('mk_fixture_'||tag,customer_ref,snapshot,3,23500) returning id into attempt;
  -- A failed second line must not reserve the first line.
  update public.kit_inventory set available_count=1 where kit_id=r;
  result:=public.reserve_multi_kit_stock(attempt,payment);
  if result->>'state'<>'sold_out' or (select available_count from public.kit_inventory where kit_id=g)<>3 or exists(select 1 from public.checkout_reservations where resource_id=payment) then raise exception 'TEST: partial stock hold on failure';end if;
  update public.kit_inventory set available_count=3 where kit_id=r;
  result:=public.reserve_multi_kit_stock(attempt,payment);
  if result->>'state'<>'held' then raise exception 'TEST: quantity hold failed';end if;
  perform public.reserve_multi_kit_stock(attempt,payment);
  if (select available_count from public.kit_inventory where kit_id=g)<>2 or (select available_count from public.kit_inventory where kit_id=r)<>1 then raise exception 'TEST: hold replay deducted twice';end if;
  rejected:=false;
  begin perform public.reserve_multi_kit_stock(attempt,payment||'_different'); exception when others then rejected:=sqlerrm='checkout_attempt_resource_mismatch';end;
  if not rejected then raise exception 'TEST: attempt resource replacement accepted';end if;
  rejected:=false;
  begin perform public.finalise_multi_kit_order(attempt,payment,customer,1,address,'first_batch');exception when others then rejected:=sqlerrm='checkout_payment_mismatch';end;
  if not rejected then raise exception 'TEST: wrong payment total accepted';end if;
  rejected:=false;
  begin perform public.finalise_multi_kit_order(attempt,payment,customer,23500,address||'{"country":"US"}'::jsonb,'first_batch');exception when others then rejected:=sqlerrm='invalid_shipping_address';end;
  if not rejected then raise exception 'TEST: non-GB shipping accepted';end if;
  result:=public.finalise_multi_kit_order(attempt,payment,customer,23500,address,'first_batch');oid:=(result->>'id')::uuid;
  if (select count(*) from public.orders where stripe_payment_id=payment)<>1 or (select count(*) from public.order_items where order_id=oid)<>2 or (select count(*) from public.order_fulfillment_units where order_id=oid)<>3 then raise exception 'TEST: incorrect order/lines/parcels';end if;
  if (select kit_id from public.orders where id=oid) is not null or (select kit_quantity from public.orders where id=oid)<>3 then raise exception 'TEST: fabricated single kit order';end if;
  if (select current_stock from public.products where id=wash)<>7 or (select current_stock from public.products where id=oil)<>8 then raise exception 'TEST: component quantities';end if;
  again:=public.finalise_multi_kit_order(attempt,payment,customer,23500,address||'{"line1":"Changed later"}'::jsonb,'first_batch');
  if again->>'id'<>result->>'id' or again->'shipping_address'->>'line1'<>'1 Fixture Road' or (select current_stock from public.products where id=wash)<>7 then raise exception 'TEST: replay/address immutability';end if;
  rejected:=false;
  begin update public.orders set dispatch_status='dispatched',tracking_number='TEST' where id=oid;exception when others then rejected:=sqlerrm='multi_kit_fulfillment_pending';end;
  if not rejected then raise exception 'TEST: legacy manual dispatch accepted';end if;
  again:=public.admin_mutate_order(oid,'dispatch','FIXTURE','royal-mail',gen_random_uuid(),'fixture@example.invalid','development',gen_random_uuid());
  if again->>'code'<>'MULTI_KIT_FULFILLMENT_PENDING' then raise exception 'TEST: audited manual dispatch lacks a clear guard';end if;
  rejected:=false;
  begin update public.orders set shipping_address='{}' where id=oid;exception when others then rejected:=sqlerrm='multi_kit_order_snapshot_immutable';end;
  if not rejected then raise exception 'TEST: immutable address update accepted';end if;
  if public.settle_checkout_reservation(payment,'released')<>'consumed' or (select available_count from public.kit_inventory where kit_id=r)<>1 then raise exception 'TEST: paid stock released';end if;
  perform public.record_checkout_full_refund(payment);perform public.record_checkout_full_refund(payment);
  if (select available_count from public.kit_inventory where kit_id=g)<>3 or (select available_count from public.kit_inventory where kit_id=r)<>3 or (select current_stock from public.products where id=wash)<>10 or (select current_stock from public.products where id=oil)<>10 then raise exception 'TEST: refund exact-once quantities';end if;
  if (select count(*) from public.order_fulfillment_units where order_id=oid and status='cancelled')<>3 or exists(select 1 from public.order_items where order_id=oid and refunded_quantity<>quantity) then raise exception 'TEST: refund line/parcel state';end if;
  -- Early full refunds must reconcile when the paid order arrives later.
  insert into public.checkout_multi_attempts(request_key,stripe_customer_id,items,total_quantity,amount_pence) values('mk_early_'||tag,customer_ref,snapshot,3,23500) returning id into attempt2;
  perform public.reserve_multi_kit_stock(attempt2,payment2);perform public.record_checkout_full_refund(payment2);
  result:=public.finalise_multi_kit_order(attempt2,payment2,customer,23500,address,'first_batch');
  if (select status from public.orders where id=(result->>'id')::uuid)<>'refunded' or (select available_count from public.kit_inventory where kit_id=r)<>3 or (select current_stock from public.products where id=wash)<>10 then raise exception 'TEST: refund-before-order race';end if;
  -- Expiry may observe payment success before order creation; finalization still works.
  insert into public.checkout_multi_attempts(request_key,stripe_customer_id,items,total_quantity,amount_pence) values('mk_worker_'||tag,customer_ref,snapshot,3,23500) returning id into attempt3;
  perform public.reserve_multi_kit_stock(attempt3,payment3);perform public.settle_checkout_reservation(payment3,'consumed');
  update public.products set current_stock=1 where id=wash;
  result:=public.finalise_multi_kit_order(attempt3,payment3,customer,23500,address,'first_batch');oid:=(result->>'id')::uuid;
  if not (select inventory_reconciliation_required from public.orders where id=oid) or (select shortfall_quantity from public.order_component_allocations where order_id=oid and product_id=wash)<>2 or (select current_stock from public.products where id=wash)<>0 then raise exception 'TEST: component shortfall was lost or blocked paid order';end if;
  perform public.record_checkout_full_refund(payment3);
  if (select current_stock from public.products where id=wash)<>1 or (select available_count from public.kit_inventory where kit_id=r)<>3 then raise exception 'TEST: shortfall refund invented stock';end if;
  foreach role_name in array array['anon','authenticated'] loop
    if has_function_privilege(role_name,'public.prepare_multi_kit_attempt(text,jsonb,text)','EXECUTE') or has_function_privilege(role_name,'public.reserve_multi_kit_stock(uuid,text)','EXECUTE') or has_table_privilege(role_name,'public.order_items','SELECT') or has_table_privilege(role_name,'public.checkout_multi_attempts','SELECT') then raise exception 'TEST: public multi-kit data/function access';end if;
  end loop;
  raise notice 'PASS: canonical prices, validation, immutable retries, rollback, exact quantities, order/parcel creation, replay, address, manual guard, late/early refunds, worker ordering, component shortfall and permissions';
end $test$;
