/**
 * E2E tests for the /buy one-time purchase flow.
 *
 * These tests cover the critical path: page renders correctly, pricing is
 * right by source, form validation blocks bad input, the checkout flow
 * advances to payment, and the success page shows the right copy.
 *
 * REQUIRES: dev server running with Supabase DEV credentials + Stripe test keys.
 * The happy path test (Group 4) makes real API calls to Supabase DEV and
 * uses Stripe's test card (4242 4242 4242 4242) — no real charges.
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Fill in the checkout form with valid data. Override any field with the third arg. */
async function fillForm(page: Page, overrides: Record<string, string> = {}) {
  const values = {
    first_name: 'Test',
    last_name: 'Buyer',
    email: `e2e+${Date.now()}@bysolum.com`,
    phone: '07700900000',
    line1: '10 Test Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    ...overrides,
  };
  await page.getByPlaceholder('James').fill(values.first_name);
  await page.getByPlaceholder('Smith').fill(values.last_name);
  await page.getByPlaceholder('james@example.com').fill(values.email);
  await page.getByPlaceholder('+44 7700 900000').fill(values.phone);
  await page.getByPlaceholder('12 Example Street').fill(values.line1);
  await page.getByPlaceholder('London').fill(values.city);
  await page.getByPlaceholder('SW1A 1AA').fill(values.postcode);
}

/** Fill Stripe's embedded card fields (renders inside an iframe in test mode). */
async function fillStripeCard(page: Page) {
  // Stripe renders the payment fields inside an iframe.
  // We target it by title — stable across Stripe versions in test mode.
  const frame = page.frameLocator('iframe[title*="Secure payment input frame"]');
  await frame.getByPlaceholder('Card number').fill('4242 4242 4242 4242');
  await frame.getByPlaceholder('MM / YY').fill('12 / 29');
  await frame.getByPlaceholder('CVC').fill('123');
}

// ─── Group 1: Pricing changes correctly by purchase source ──────────────────
//
// The URL param ?source controls which price tier is shown.
// first_batch → standard prices (£65 / £85)
// gift / tiktok → premium prices (£75 / £95) — £10 gift/TikTok premium
// ?source=tiktok is a short form — the page normalises it to tiktok_shop internally.

test.describe('Pricing by source', () => {
  test('first_batch source shows standard prices: GROUND £65, RITUAL £85', async ({ page }) => {
    await page.goto('/buy');
    await expect(page.getByTestId('kit-ground')).toContainText('£65');
    await expect(page.getByTestId('kit-ritual')).toContainText('£85');
  });

  test('gift source shows premium prices: GROUND £75, RITUAL £95', async ({ page }) => {
    await page.goto('/buy?source=gift');
    await expect(page.getByTestId('kit-ground')).toContainText('£75');
    await expect(page.getByTestId('kit-ritual')).toContainText('£95');
  });

  test('?source=tiktok (short form) shows premium prices: GROUND £75, RITUAL £95', async ({ page }) => {
    // The URL uses ?source=tiktok but the page normalises it to tiktok_shop internally.
    // This test confirms the normalisation works so TikTok ads get correct pricing.
    await page.goto('/buy?source=tiktok');
    await expect(page.getByTestId('kit-ground')).toContainText('£75');
    await expect(page.getByTestId('kit-ritual')).toContainText('£95');
  });
});

// ─── Group 2: Stock counter visibility ──────────────────────────────────────
//
// The stock counter ("X of 250 remaining") is a scarcity signal for first_batch
// only — it doesn't make sense for gift or TikTok purchases where the buyer
// isn't responding to a limited-batch campaign.

test.describe('Stock counter visibility', () => {
  test('shows "X of 250 remaining" counter on first_batch pages', async ({ page }) => {
    await page.goto('/buy');
    await expect(page.getByTestId('stock-count')).toBeVisible({ timeout: 5_000 });
  });

  test('hides stock counter on gift pages — not relevant to gift buyers', async ({ page }) => {
    await page.goto('/buy?source=gift');
    await expect(page.getByTestId('stock-count')).not.toBeVisible({ timeout: 5_000 });
  });

  test('hides stock counter on TikTok pages — not relevant to TikTok buyers', async ({ page }) => {
    await page.goto('/buy?source=tiktok');
    await expect(page.getByTestId('stock-count')).not.toBeVisible({ timeout: 5_000 });
  });
});

// ─── Group 3: Form validation ────────────────────────────────────────────────
//
// These tests confirm the form won't proceed to payment if key fields are missing.
// Phone is required because we use it for delivery updates — it's explicitly
// labelled as such and must be enforced here, not silently dropped.

test.describe('Form validation blocks incomplete submissions', () => {
  test('blocks submit when first name is empty', async ({ page }) => {
    await page.goto('/buy');
    await fillForm(page, { first_name: '' });
    await page.getByTestId('continue-btn').click();
    await expect(page.getByTestId('form-error')).toContainText(/first name is required/i);
    // Payment element must NOT be visible — we're still on the form stage
    await expect(page.getByTestId('payment-element-wrapper')).not.toBeVisible();
  });

  test('blocks submit when phone is empty — phone is required for delivery updates', async ({ page }) => {
    await page.goto('/buy');
    await fillForm(page, { phone: '' });
    await page.getByTestId('continue-btn').click();
    await expect(page.getByTestId('form-error')).toContainText(/phone number is required/i);
    await expect(page.getByTestId('payment-element-wrapper')).not.toBeVisible();
  });

  test('blocks submit when postcode is empty', async ({ page }) => {
    await page.goto('/buy');
    await fillForm(page, { postcode: '' });
    await page.getByTestId('continue-btn').click();
    await expect(page.getByTestId('form-error')).toContainText(/postcode is required/i);
    await expect(page.getByTestId('payment-element-wrapper')).not.toBeVisible();
  });

  test('blocks submit when email is invalid', async ({ page }) => {
    await page.goto('/buy');
    await fillForm(page, { email: 'notanemail' });
    await page.getByTestId('continue-btn').click();
    await expect(page.getByTestId('form-error')).toContainText(/valid email/i);
    await expect(page.getByTestId('payment-element-wrapper')).not.toBeVisible();
  });
});

// ─── Group 4: Checkout flow ──────────────────────────────────────────────────
//
// The form → payment → success path. The first test confirms the transition
// to the payment stage works (calls the Supabase edge function and gets back
// a Stripe client_secret). The happy path test goes all the way through Stripe.
//
// NOTE: Both tests make real API calls to Supabase DEV with Stripe test keys.
// No real charges are made — Stripe test card 4242 4242 4242 4242 always succeeds.

test.describe('Checkout flow', () => {
  test('valid form advances to payment stage and shows Stripe payment fields', async ({ page }) => {
    await page.goto('/buy');
    await fillForm(page);
    await page.getByTestId('continue-btn').click();

    // After submitting the form, the page calls create-first-box-payment-intent
    // and mounts the Stripe PaymentElement. We wait for the wrapper to appear.
    await expect(page.getByTestId('payment-element-wrapper')).toBeVisible({ timeout: 15_000 });

    // Confirm the "No subscription" copy is shown — reassures the buyer
    await expect(page.getByText(/no subscription/i)).toBeVisible();
  });

  test('full purchase: test card goes through and redirects to /success', async ({ page }) => {
    await page.goto('/buy?kit=ground');
    await fillForm(page);
    await page.getByTestId('continue-btn').click();

    // Wait for Stripe PaymentElement to mount
    await expect(page.getByTestId('payment-element-wrapper')).toBeVisible({ timeout: 15_000 });

    // Fill in Stripe's embedded card iframe
    await fillStripeCard(page);

    // Click pay
    await page.getByTestId('pay-btn').click();

    // Stripe test mode confirms synchronously — we should land on /success
    await page.waitForURL(/\/success/, { timeout: 30_000 });

    // URL must have source=first_batch so SuccessPage shows one-time copy
    expect(page.url()).toContain('source=first_batch');
    expect(page.url()).toContain('kit=ground');
    await expect(page.getByText(/order confirmed/i)).toBeVisible();
  });
});

// ─── Group 5: Success page copy branches correctly by purchase type ───────────
//
// SuccessPage reads ?source from the URL and branches on it.
// One-time buyers (first_batch / gift / tiktok_shop) must NOT see:
//   - "Monthly refills arrive before you run out"
//   - "Manage subscription" link
// Subscription buyers must see both of those.
// These tests hit the SuccessPage directly (no purchase needed).

test.describe('SuccessPage shows correct copy by purchase type', () => {
  test('first_batch buyer sees "check in at two weeks" — not subscription copy', async ({ page }) => {
    await page.goto('/success?kit=ground&source=first_batch&ref=pi_test_ABCD1234');
    await expect(page.getByText(/we.ll check in at two weeks/i)).toBeVisible();
    await expect(page.getByText(/monthly refills arrive/i)).not.toBeVisible();
    await expect(page.getByText(/manage subscription/i)).not.toBeVisible();
  });

  test('gift buyer sees "check in at two weeks" — not subscription copy', async ({ page }) => {
    await page.goto('/success?kit=ritual&source=gift&ref=pi_test_ABCD1234');
    await expect(page.getByText(/we.ll check in at two weeks/i)).toBeVisible();
    await expect(page.getByText(/manage subscription/i)).not.toBeVisible();
  });

  test('subscription buyer (no source param) sees monthly refills copy', async ({ page }) => {
    await page.goto('/success?kit=ground&ref=cs_test_ABCD1234');
    await expect(page.getByText(/monthly refills arrive/i)).toBeVisible();
    await expect(page.getByText(/manage subscription/i)).toBeVisible();
  });

  test('displays order reference from the ?ref param (last 8 chars uppercased)', async ({ page }) => {
    // SuccessPage slices the last 8 chars of the ref param and uppercases them.
    // pi_test_ABCDEFGH → shown as #ABCDEFGH
    await page.goto('/success?kit=ground&source=first_batch&ref=pi_test_ABCDEFGH');
    await expect(page.getByText(/#ABCDEFGH/i)).toBeVisible();
  });
});
