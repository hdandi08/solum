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
