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
