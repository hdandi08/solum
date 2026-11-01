// Integration test against an explicitly selected non-production database.
// Caller supplies an authenticated SQL transport. No real kits or customers used.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
export async function testReservations(query) {
  const tag = randomUUID().replaceAll('-', '');
  const kit = `reservation_test_${tag}`;
  const resources = Array.from({length: 12}, (_, i) => `pi_test_${tag}_${i}`);
  const order = randomUUID();
  const refundedOrder = randomUUID();
  const fixtureCustomer = randomUUID();
  let customerId;
  try {
    await query(`insert into public.kit_inventory(kit_id,available_count) values ('${kit}',1)`);
    const results = await Promise.all(resources.map(id => query(`select public.reserve_checkout_stock('${kit}','${id}','payment_intent') as result`)));
    const won = results.flatMap((r,i) => r[0].result.state === 'held' ? [resources[i]] : []);
    assert.equal(won.length, 1, 'only one of twelve concurrent buyers reserves the last unit');
    const resource = won[0];
    const again = await query(`select public.reserve_checkout_stock('${kit}','${resource}','payment_intent') as result`);
    assert.equal(again[0].result.state, 'held', 'retry returns the original hold');
    assert.equal((await query(`select available_count from public.kit_inventory where kit_id='${kit}'`))[0].available_count,0);
    await query(`select public.settle_checkout_reservation('${resource}','consumed')`);
    await query(`select public.settle_checkout_reservation('${resource}','released')`);
    assert.equal((await query(`select available_count from public.kit_inventory where kit_id='${kit}'`))[0].available_count,0,'paid stock is never released');
    customerId = (await query("select id from public.customers where email='harsha@ecompilers.com' limit 1"))[0]?.id;
    if (!customerId) {
      await query(`insert into public.customers(id,email) values ('${fixtureCustomer}','harsha@ecompilers.com')`);
      customerId = fixtureCustomer;
    }
    await query(`insert into public.orders(id,customer_id,kit_id,order_type,stripe_payment_id,amount_pence,status) values ('${order}','${customerId}','${kit}','first_box','${resource}',8500,'paid')`);
    await query(`do $$ begin
      insert into public.orders(customer_id,kit_id,order_type,stripe_payment_id,amount_pence,status) values ('${customerId}','${kit}','first_box','${resource}',8500,'paid');
      raise exception 'duplicate payment was accepted';
      exception when unique_violation then null;
    end $$`);
    await Promise.all(Array.from({length:4},()=>query(`select public.finalise_checkout_inventory('${order}','${resource}')`)));
    assert.equal((await query(`select available_count from public.kit_inventory where kit_id='${kit}'`))[0].available_count,0,'order finalisation does not deduct the held kit twice');
    await Promise.all(Array.from({length:4},()=>query(`select public.restock_checkout_inventory('${order}')`)));
    assert.equal((await query(`select available_count from public.kit_inventory where kit_id='${kit}'`))[0].available_count,1,'refund increments once');
    const next = resources.find(id=>id!==resource);
    await query(`select public.reserve_checkout_stock('${kit}','${next}','payment_intent')`);
    await Promise.all(Array.from({length:4},()=>query(`select public.settle_checkout_reservation('${next}','released')`)));
    assert.equal((await query(`select available_count from public.kit_inventory where kit_id='${kit}'`))[0].available_count,1,'expiry increments once');
    assert.equal((await query(`select public.reserve_checkout_stock('${kit}','${next}','payment_intent') as result`))[0].result.state,'released','old resource cannot acquire a new hold');
    const earlyRefund = resources.find(id=>id!==resource && id!==next);
    await query(`select public.reserve_checkout_stock('${kit}','${earlyRefund}','payment_intent')`);
    await query(`select public.record_checkout_full_refund('${earlyRefund}')`);
    await query(`insert into public.orders(id,customer_id,kit_id,order_type,stripe_payment_id,amount_pence,status) values ('${refundedOrder}','${customerId}','${kit}','first_box','${earlyRefund}',8500,'paid')`);
    await query(`select public.finalise_checkout_inventory('${refundedOrder}','${earlyRefund}')`);
    await query(`select public.record_checkout_full_refund('${earlyRefund}')`);
    assert.equal((await query(`select available_count from public.kit_inventory where kit_id='${kit}'`))[0].available_count,1,'refund before order creation reconciles and restocks once');
    assert.equal((await query(`select status from public.orders where id='${refundedOrder}'`))[0].status,'refunded');
    for(const role of ['anon','authenticated']) {
      assert.equal((await query(`select has_function_privilege('${role}','public.reserve_checkout_stock(text,text,text)','EXECUTE') as allowed`))[0].allowed,false);
      assert.equal((await query(`select has_table_privilege('${role}','public.checkout_reservations','SELECT') as allowed`))[0].allowed,false);
    }
    console.log('PASS: concurrent last unit, retries, paid hold, order replay, refund, expiry, stale resource, permissions');
  } finally {
    await query(`delete from public.orders where id in ('${order}','${refundedOrder}')`);
    if((await query("select to_regclass('public.checkout_full_refunds') is not null as present"))[0].present) await query(`delete from public.checkout_full_refunds where payment_id like 'pi_test_${tag}_%'`);
    await query(`delete from public.customers where id='${fixtureCustomer}'`);
    if((await query("select to_regclass('public.checkout_reservations') is not null as present"))[0].present) await query(`delete from public.checkout_reservations where kit_id='${kit}'`);
    await query(`delete from public.kit_inventory where kit_id='${kit}'`);
  }
}
