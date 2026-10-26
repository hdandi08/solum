import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { firstBoxPaymentIntentShipping } from './firstBoxShipping.ts';

const shippingInput = {
  firstName: 'Harsha',
  lastName: 'Dandi',
  line1: '14 Example Street',
  line2: '',
  city: 'London',
  postcode: 'SW1A 1AA',
};

Deno.test('Express Checkout leaves PaymentIntent shipping for Stripe.js to set', () => {
  assertEquals(firstBoxPaymentIntentShipping(shippingInput, { deferToWallet: true }), undefined);
});

Deno.test('card checkout keeps the server-provided PaymentIntent shipping address', () => {
  assertEquals(firstBoxPaymentIntentShipping(shippingInput, { deferToWallet: false }), {
    name: 'Harsha Dandi',
    address: {
      line1: '14 Example Street',
      city: 'London',
      postal_code: 'SW1A 1AA',
      country: 'GB',
    },
  });
});
