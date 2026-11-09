import { afterEach, describe, expect, it, vi } from 'vitest';
import { rememberPaymentResult, resolvePurchaseConfirmation, claimPurchaseEvent } from './purchaseConfirmation.js';
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
const paid = { id: 'pi_paid', status: 'succeeded', amount: 8500, currency: 'gbp', livemode: true };
afterEach(() => vi.useRealTimers());
describe('purchase confirmation', () => {
  it('does not confirm an arbitrary success URL', async () => {
    expect(await resolvePurchaseConfirmation({ reference: 'pi_madeup', storage: storage() })).toEqual({ status: 'unverified' });
  });
  it('uses the Stripe result saved by checkout', async () => {
    const store = storage(); rememberPaymentResult(paid, 'ritual', store);
    expect(await resolvePurchaseConfirmation({ reference: 'pi_paid', storage: store })).toMatchObject({ status: 'confirmed', purchase: { eventId: 'pi_paid', value: 85, kitId: 'ritual', livemode: true } });
  });
  it('keeps processing payments pending without a purchase', async () => {
    const store = storage(); rememberPaymentResult({ ...paid, status: 'processing' }, 'ritual', store);
    expect(await resolvePurchaseConfirmation({ reference: 'pi_paid', storage: store })).toEqual({ status: 'processing' });
  });
  it('does not reuse another payment confirmation', async () => {
    const store = storage(); rememberPaymentResult(paid, 'ritual', store);
    expect(await resolvePurchaseConfirmation({ reference: 'pi_other', storage: store })).toEqual({ status: 'unverified' });
  });
  it('checks redirected payments with Stripe', async () => {
    const stripe = { retrievePaymentIntent: vi.fn(async () => ({ paymentIntent: paid })) };
    expect(await resolvePurchaseConfirmation({ reference: 'pi_paid', clientSecret: 'pi_paid_secret_redirect', kitId: 'ritual', stripe, storage: storage() })).toMatchObject({ status: 'confirmed', purchase: { eventId: 'pi_paid', value: 85 } });
    expect(stripe.retrievePaymentIntent).toHaveBeenCalledWith('pi_paid_secret_redirect');
  });
  it.each(['processing', 'requires_action', 'requires_payment_method', 'canceled'])('never confirms Stripe status %s', async status => {
    const stripe = { retrievePaymentIntent: async () => ({ paymentIntent: { ...paid, status } }) };
    const result = await resolvePurchaseConfirmation({ reference: 'pi_paid', clientSecret: 'pi_paid_secret_redirect', kitId: 'ritual', stripe, storage: storage() });
    expect(result.status).not.toBe('confirmed'); expect(result.purchase).toBeUndefined();
  });
  it('rejects mismatched payment references', async () => {
    const stripe = { retrievePaymentIntent: async () => ({ paymentIntent: { ...paid, id: 'pi_other' } }) };
    expect(await resolvePurchaseConfirmation({ reference: 'pi_paid', clientSecret: 'pi_paid_secret_redirect', kitId: 'ritual', stripe, storage: storage() })).toEqual({ status: 'unverified' });
  });
  it('fails closed when Stripe cannot be reached', async () => {
    const stripe = { retrievePaymentIntent: async () => { throw new Error('offline'); } };
    expect(await resolvePurchaseConfirmation({ reference: 'pi_paid', clientSecret: 'pi_paid_secret_redirect', kitId: 'ritual', stripe, storage: storage() })).toEqual({ status: 'unverified' });
  });
  it.each([{ amount: 0 }, { currency: 'usd' }, { amount: NaN }])('rejects invalid purchase values %j', async patch => {
    const store = storage(); rememberPaymentResult({ ...paid, ...patch }, 'ritual', store);
    expect(await resolvePurchaseConfirmation({ reference: 'pi_paid', storage: store })).toEqual({ status: 'unverified' });
  });
  it('expires old browser confirmations', async () => {
    vi.useFakeTimers(); const store = storage(); rememberPaymentResult(paid, 'ritual', store); vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    expect(await resolvePurchaseConfirmation({ reference: 'pi_paid', storage: store })).toEqual({ status: 'unverified' });
  });
  it('confirms inline payments through navigation state when browser storage is blocked', async () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const inlineResult = rememberPaymentResult(paid, 'ritual', blocked);
    expect(await resolvePurchaseConfirmation({ reference: 'pi_paid', inlineResult, storage: blocked })).toMatchObject({ status: 'confirmed', purchase: { eventId: 'pi_paid', value: 85 } });
  });
  it('claims a confirmed purchase once and never claims a pending payment', () => {
    const store = storage(); expect(claimPurchaseEvent({ status: 'processing' }, store)).toBe(false);
    const confirmed = { status: 'confirmed', purchase: { eventId: 'pi_paid', value: 85 } };
    expect(claimPurchaseEvent(confirmed, store)).toBe(true); expect(claimPurchaseEvent(confirmed, store)).toBe(false);
  });
});
