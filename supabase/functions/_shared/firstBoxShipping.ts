type FirstBoxShippingInput = {
  firstName?: string | null;
  lastName?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  postcode?: string | null;
};

export function firstBoxPaymentIntentShipping(
  input: FirstBoxShippingInput,
  { deferToWallet }: { deferToWallet: boolean },
) {
  if (deferToWallet) return undefined;

  return {
    name: [input.firstName, input.lastName].filter(Boolean).join(' '),
    address: {
      line1: input.line1 ?? '',
      ...(input.line2 ? { line2: input.line2 } : {}),
      city: input.city ?? '',
      postal_code: input.postcode ?? '',
      country: 'GB',
    },
  };
}
