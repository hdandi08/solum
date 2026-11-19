import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildPosthogPurchase } from './posthog.ts';

Deno.test('buildPosthogPurchase shapes event with dedup insert_id', () => {
  const e = buildPosthogPurchase({ apiKey: 'phc_x', email: 'A@B.com', piId: 'pi_123', kitId: 'ritual', amountPence: 8500, source: 'ig' });
  assertEquals(e.api_key, 'phc_x');
  assertEquals(e.event, 'purchase');
  assertEquals(e.distinct_id, 'a@b.com');
  assertEquals(e.properties.kit, 'ritual');
  assertEquals(e.properties.revenue_pence, 8500);
  assertEquals(e.properties.ref, 'pi_123');
  assertEquals(e.properties.$insert_id, 'pi_123');
  assertEquals(e.properties.server_side, true);
});

Deno.test('buildPosthogPurchase uses provided host when given', () => {
  const e = buildPosthogPurchase({ apiKey: 'phc_x', email: 'a@b.com', piId: 'pi_456', kitId: 'ground', amountPence: 6500, source: 'ig', host: 'bysolum.com' });
  assertEquals(e.properties.$host, 'bysolum.com');
});

Deno.test('buildPosthogPurchase falls back to bysolum.co.uk when host is omitted', () => {
  const e = buildPosthogPurchase({ apiKey: 'phc_x', email: 'a@b.com', piId: 'pi_789', kitId: 'ritual', amountPence: 8500, source: 'ig' });
  assertEquals(e.properties.$host, 'bysolum.co.uk');
});

Deno.test('buildPosthogPurchase falls back to bysolum.co.uk when host is null', () => {
  const e = buildPosthogPurchase({ apiKey: 'phc_x', email: 'a@b.com', piId: 'pi_000', kitId: 'ritual', amountPence: 8500, source: 'ig', host: null });
  assertEquals(e.properties.$host, 'bysolum.co.uk');
});

Deno.test('multi-kit purchase carries one total and real line quantities with no invented SKU',()=>{
 const event=buildPosthogPurchase({apiKey:'phc_fixture',piId:'pi_multi',amountPence:23500,items:[{kit_id:'ground',quantity:1,unit_amount_pence:6500,line_amount_pence:6500},{kit_id:'ritual',quantity:2,unit_amount_pence:8500,line_amount_pence:17000}]} as any);
 assertEquals(event.properties.revenue_pence,23500);assertEquals((event.properties as any).total_quantity,3);assertEquals((event.properties as any).items[1].quantity,2);assertEquals(Object.hasOwn(event.properties,'kit'),false);assertEquals(event.properties.$insert_id,'pi_multi');
});
