// Explicit non-production integration caller supplies the DEV-only SQL transport.
// Synthetic kit IDs only: no real sellable count, customer or provider is touched.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function testMultiKitConcurrency(query) {
  const tag = randomUUID().replaceAll('-', '');
  const ground = `mk_concurrency_${tag}_g`;
  const ritual = `mk_concurrency_${tag}_r`;
  const requests = Array.from({ length: 12 }, (_, index) => ({ id: randomUUID(), resource: `pi_mk_${tag}_${index}` }));
  const items = [
    { kit_id: ground, quantity: 1, unit_amount_pence: 6500, line_amount_pence: 6500 },
    { kit_id: ritual, quantity: 1, unit_amount_pence: 8500, line_amount_pence: 8500 },
  ];
  const counts = async () => (await query(`select available_count from public.kit_inventory where kit_id in ('${ground}','${ritual}') order by kit_id`)).map(row => row.available_count);
  try {
    await query(`insert into public.kit_inventory(kit_id,available_count) values ('${ground}',1),('${ritual}',1);
      insert into public.checkout_multi_attempts(id,request_key,stripe_customer_id,items,total_quantity,amount_pence) values
      ${requests.map((request,index) => `('${request.id}','mk_concurrency_${tag}_${index}','cus_fixture_${tag}','${JSON.stringify(index % 2 ? [...items].reverse() : items)}'::jsonb,2,15000)`).join(',')};`);
    const results = await Promise.all(requests.map(request => query(`select public.reserve_multi_kit_stock('${request.id}','${request.resource}') as result`)));
    const winners = results.flatMap((rows,index) => rows[0].result.state === 'held' ? [requests[index]] : []);
    assert.equal(winners.length,1,'one of twelve concurrent requests wins both last kit units');
    const winner = winners[0];
    assert.deepEqual(await counts(),[0,0]);
    const repeats = await Promise.all(Array.from({ length:4 }, () => query(`select public.reserve_multi_kit_stock('${winner.id}','${winner.resource}') as result`)));
    assert.ok(repeats.every(rows => rows[0].result.state === 'held'));
    assert.deepEqual(await counts(),[0,0],'reserve replay does not decrement twice');
    await Promise.all(Array.from({ length:4 }, () => query(`select public.settle_checkout_reservation('${winner.resource}','released') as result`)));
    assert.deepEqual(await counts(),[1,1],'concurrent release returns each quantity once');
    assert.equal((await query(`select public.reserve_multi_kit_stock('${winner.id}','${winner.resource}') as result`))[0].result.state,'released','released resources cannot acquire another hold');
    const next = requests.find(request => request.id !== winner.id);
    assert.equal((await query(`select public.reserve_multi_kit_stock('${next.id}','${next.resource}') as result`))[0].result.state,'held');
    await query(`select public.settle_checkout_reservation('${next.resource}','consumed')`);
    await query(`select public.settle_checkout_reservation('${next.resource}','released')`);
    assert.deepEqual(await counts(),[0,0],'a paid reservation cannot release consumed stock');
    console.log('PASS: multi-kit concurrent last units, deterministic lock order, replay, release, stale and consumed resources.');
  } finally {
    await query(`delete from public.checkout_reservations where resource_id like 'pi_mk_${tag}_%';
      delete from public.checkout_multi_attempts where request_key like 'mk_concurrency_${tag}_%';
      delete from public.kit_inventory where kit_id in ('${ground}','${ritual}');`);
  }
}
