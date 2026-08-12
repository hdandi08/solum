import { buildFirstBoxPaymentIntentBody } from './firstBoxPaymentIntent.js';

export const RESTORED_EXPRESS_WALLETS = Object.freeze({
  applePay: 'auto',
  googlePay: 'auto',
  link: 'auto',
  paypal: 'auto',
  amazonPay: 'never',
  klarna: 'never',
});

export const RESTORED_STRIPE_PAYMENT_METHOD_TYPES = Object.freeze([
  'card',
  'link',
  'paypal',
]);

export const EXPRESS_CHECKOUT_EVENTS = Object.freeze({
  availability: 'express_availability',
  clicked: 'express_clicked',
  cancelled: 'express_cancelled',
  error: 'express_error',
  initiated: 'checkout_initiated',
});

export function expressCheckoutElementOptions() {
  return {
    buttonHeight: 48,
    emailRequired: true,
    shippingAddressRequired: true,
    phoneNumberRequired: false,
    allowedShippingCountries: ['GB'],
    shippingRates: [{
      id: 'delivery-included',
      displayName: 'UK delivery included',
      amount: 0,
    }],
    paymentMethods: { ...RESTORED_EXPRESS_WALLETS },
  };
}

export function notifyExpressPaymentFailed(event, message) {
  const publicMessage = String(message ?? '').trim().slice(0, 200);
  event?.paymentFailed?.({
    reason: 'fail',
    ...(publicMessage ? { message: publicMessage } : {}),
  });
}

export function expressElementsOptions({ amountPence, appearance }) {
  return {
    mode: 'payment',
    amount: amountPence,
    currency: 'gbp',
    paymentMethodTypes: [...RESTORED_STRIPE_PAYMENT_METHOD_TYPES],
    appearance,
  };
}

function walletForm(event) {
  const shipping = event.shippingAddress ?? {};
  const billing = event.billingDetails ?? {};
  const address = shipping.address ?? {};
  const fullName = String(shipping.name || billing.name || '').trim();
  const [firstName = '', ...lastNameParts] = fullName.split(/\s+/).filter(Boolean);

  return {
    form: {
      email: String(billing.email ?? '').trim().toLowerCase(),
      first_name: firstName || fullName || 'Customer',
      last_name: lastNameParts.join(' '),
      phone: String(billing.phone ?? '').trim(),
      line1: String(address.line1 ?? '').trim(),
      line2: String(address.line2 ?? '').trim(),
      city: String(address.city ?? '').trim(),
      county: String(address.state ?? '').trim(),
      postcode: String(address.postal_code ?? '').trim(),
    },
    firstName: firstName || fullName || 'Customer',
  };
}

export async function buildExpressPaymentIntentBody({
  event,
  kitId,
  source,
  siteHost,
  tikTokIds = {},
  metaIds = {},
  attribution = {},
}, tokenResolver) {
  const { form, firstName } = walletForm(event);
  const body = await buildFirstBoxPaymentIntentBody({
    kitId,
    form,
    source,
    siteHost,
    tikTokIds,
    metaIds,
    attribution,
  }, tokenResolver);

  return {
    buyer: { email: form.email, firstName },
    body,
  };
}
