import { assertEquals } from 'jsr:@std/assert';
import { shouldSendExternalPurchaseSideEffects } from './purchaseSafety.ts';

Deno.test('external purchase side effects require Stripe live mode', () => {
  assertEquals(shouldSendExternalPurchaseSideEffects(true), true);
  assertEquals(shouldSendExternalPurchaseSideEffects(false), false);
  assertEquals(shouldSendExternalPurchaseSideEffects(undefined), false);
});
