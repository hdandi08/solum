import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { boundedTrackingId, stripePaymentMethodTypesForWallets } from './paymentMethods.ts';

Deno.test('maps every restored express wallet to the required Stripe payment method types', () => {
  assertEquals(
    stripePaymentMethodTypesForWallets(['apple_pay', 'google_pay', 'link', 'paypal']),
    ['card', 'link', 'paypal'],
  );
});

Deno.test('accepts only bounded opaque click identifiers for Stripe metadata', () => {
  assertEquals(boundedTrackingId(' fb.1.123.click_id '), 'fb.1.123.click_id');
  assertEquals(boundedTrackingId('bad value'), '');
  assertEquals(boundedTrackingId('<script>'), '');
  assertEquals(boundedTrackingId('x'.repeat(501)), '');
});
