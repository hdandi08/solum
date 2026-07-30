export function shouldSendExternalPurchaseSideEffects(
  livemode: boolean | undefined,
): boolean {
  return livemode === true;
}
