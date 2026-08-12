const WALLET_TO_STRIPE_TYPE: Record<string, string> = {
  apple_pay: 'card',
  google_pay: 'card',
  link: 'link',
  paypal: 'paypal',
};

const VALID_TRACKING_ID = /^[A-Za-z0-9._~-]{1,500}$/;

export function boundedTrackingId(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  return VALID_TRACKING_ID.test(normalized) ? normalized : '';
}

export function stripePaymentMethodTypesForWallets(wallets: string[]): string[] {
  return [...new Set(wallets.map((wallet) => WALLET_TO_STRIPE_TYPE[wallet]).filter(Boolean))];
}

export function dynamicPaymentMethodOptions() {
  return {
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'always' as const,
    },
  };
}
