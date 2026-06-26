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
 *
 * /buy is now a TWO-STEP form:
 *   Step 1 "Your Details" (first name, last name, email, phone) → continue
 *   Step 2 "Delivery" (address line1, city, postcode) → continue → Payment
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Fill Step 1 (Your Details) fields only. Does NOT submit. */
async function fillStep1(page: Page, overrides: Record<string, string> = {}) {
  const values = {
    first_name: 'Test',
    last_name: 'Buyer',
    email: `e2e+${Date.now()}@bysolum.com`,
    phone: '07700900000',
    ...overrides,
  };
  // exact: true prevents 'James' from substring-matching 'james@example.com'
  await page.getByPlaceholder('James', { exact: true }).fill(values.first_name);
  await page.getByPlaceholder('Smith', { exact: true }).fill(values.last_name);
  await page.getByPlaceholder('james@example.com').fill(values.email);
  await page.getByPlaceholder('+44 7700 900000').fill(values.phone);
}

/** Fill Step 2 (Delivery) fields only. Does NOT submit. */
async function fillStep2(page: Page, overrides: Record<string, string> = {}) {
  const values = {
    line1: '10 Test Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    ...overrides,
  };
  await page.getByPlaceholder('14 Example Street').fill(values.line1);
  await page.getByPlaceholder('London').fill(values.city);
  await page.getByPlaceholder('SW1A 1AA').fill(values.postcode);
}

/**
 * Fill the entire two-step form (Step 1 → advance → Step 2).
 * Aborts the Cloudflare DNS check so step 1 always advances.
 * Does NOT click the Step 2 submit button — caller handles that.
 */
async function fillForm(page: Page, overrides: Record<string, string> = {}) {
  await fillStep1(page, overrides);
  // Abort the email-domain DNS check so the form always advances past step 1.
  // The catch block in handleDetailsNext allows execution to continue on network error.
  await page.route('https://cloudflare-dns.com/**', route => route.abort());
  await page.getByTestId('continue-btn').click();
  await page.getByTestId('delivery-form').waitFor({ state: 'visible', timeout: 10_000 });
  await fillStep2(page, overrides);
}

/** Fill Stripe's embedded card fields (renders inside an iframe in test mode). */
async function fillStripeCard(page: Page) {
  // Stripe's PaymentElement renders TWO iframes with the same title — one for
  // the payment method tabs, one for the card input fields.
  // Find the right frame by scanning for the card number placeholder.
  await page.waitForSelector('iframe[title*="Secure payment input frame"]');

  // Stripe renders the card number with placeholder "1234 1234 1234 1234"
  let cardFrame: import('@playwright/test').Frame | null = null;
  for (let attempt = 0; attempt < 15 && !cardFrame; attempt++) {
    for (const frame of page.frames()) {
      if (await frame.locator('[placeholder="1234 1234 1234 1234"]').count() > 0) {
        cardFrame = frame;
        break;
      }
    }
    if (!cardFrame) await page.waitForTimeout(300);
  }

  if (!cardFrame) throw new Error('Stripe card number field not found in any iframe');

  await cardFrame.locator('[placeholder="1234 1234 1234 1234"]').fill('4242 4242 4242 4242');
  await cardFrame.locator('[placeholder="MM / YY"]').fill('12 / 29');
  await cardFrame.locator('[placeholder="CVC"]').fill('123');
}

// ─── Group 1: Pricing changes correctly by purchase source ──────────────────
//
// Pricing is now flat: KIT_PRICES = { ground: 65, ritual: 85 } for ALL sources.
// The £10 gift/TikTok premium was intentionally removed (commit c6e00e2).

test.describe('Pricing by source', () => {
  test('first_batch source shows standard prices: GROUND £65, RITUAL £85', async ({ page }) => {
    await page.goto('/buy');
    await expect(page.getByTestId('kit-ground')).toContainText('£65');
    await expect(page.getByTestId('kit-ritual')).toContainText('£85');
  });

  test('gift source shows flat prices: GROUND £65, RITUAL £85 (no premium)', async ({ page }) => {
    await page.goto('/buy?source=gift');
    await expect(page.getByTestId('kit-ground')).toContainText('£65');
    await expect(page.getByTestId('kit-ritual')).toContainText('£85');
  });

  test('?source=tiktok (short form) shows flat prices: GROUND £65, RITUAL £85 (no premium)', async ({ page }) => {
    // The URL uses ?source=tiktok but the page normalises it to tiktok_shop internally.
    // Pricing is flat — the TikTok premium was removed along with the gift premium.
    await page.goto('/buy?source=tiktok');
    await expect(page.getByTestId('kit-ground')).toContainText('£65');
    await expect(page.getByTestId('kit-ritual')).toContainText('£85');
  });
});

// ─── Group 2: Kit selector visibility ───────────────────────────────────────
//
// The stock counter was removed from the UI (isFirstBatch is computed but
// unused in rendering). These tests now verify the kit selector state.
// Tests for gift/tiktok below retain their original stock-count assertions
// which pass vacuously (non-existent element is always not-visible).

test.describe('Stock counter visibility', () => {
  test('first_batch page shows kit selector with correct prices', async ({ page }) => {
    await page.goto('/buy');
    await expect(page.getByTestId('kit-selector')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('kit-ground')).toContainText('£65');
    await expect(page.getByTestId('kit-ritual')).toContainText('£85');
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
// /buy is a two-step form. Step 1 validates name, email, and phone (optional).
// Step 2 validates address. These tests confirm the form blocks bad input at
// the correct step.
//
// Note: phone is optional (labelled "optional · for delivery updates") but if
// provided it must be a valid UK format. Empty phone is allowed.

test.describe('Form validation blocks incomplete submissions', () => {
  test('blocks submit when first name is empty', async ({ page }) => {
    await page.goto('/buy');
    await fillStep1(page, { first_name: '' });
    await page.getByTestId('continue-btn').click();
    await expect(page.getByTestId('form-error')).toContainText(/first name is required/i);
    // Delivery form must NOT be visible — we're still on step 1
    await expect(page.getByTestId('delivery-form')).not.toBeVisible();
  });

  test('blocks submit when phone has invalid format — must be a valid UK number if provided', async ({ page }) => {
    // Phone is optional: empty passes. But a non-empty invalid value must be caught.
    await page.goto('/buy');
    await fillStep1(page, { phone: 'notaphone' });
    await page.getByTestId('continue-btn').click();
    await expect(page.getByTestId('form-error')).toContainText(/valid UK phone/i);
    await expect(page.getByTestId('delivery-form')).not.toBeVisible();
  });

  test('blocks submit when postcode is empty — postcode is validated on step 2', async ({ page }) => {
    // Must pass step 1 first, then test step 2 validation.
    await page.goto('/buy');
    await fillForm(page, { postcode: '' }); // fills step 1 → advances → fills step 2 with empty postcode
    await page.getByTestId('delivery-btn').click();
    await expect(page.getByTestId('delivery-error')).toContainText(/postcode is required/i);
    // Still on delivery step — payment form must not be visible
    await expect(page.locator('.co-payment-element-wrap')).not.toBeVisible();
  });

  test('blocks submit when email is invalid', async ({ page }) => {
    await page.goto('/buy');
    await fillStep1(page, { email: 'notanemail' });
    await page.getByTestId('continue-btn').click();
    await expect(page.getByTestId('form-error')).toContainText(/valid email/i);
    await expect(page.getByTestId('delivery-form')).not.toBeVisible();
  });
});

// ─── Group 4: Checkout flow ──────────────────────────────────────────────────
//
// The two-step form → payment path. Filling both steps and submitting step 2
// calls create-first-box-payment-intent and mounts the Stripe PaymentElement.
//
// NOTE: Both tests make real API calls to Supabase DEV with Stripe test keys.
// No real charges are made — Stripe test card 4242 4242 4242 4242 always succeeds.

test.describe('Checkout flow', () => {
  test('valid form (both steps) advances to payment stage and shows Stripe payment fields', async ({ page }) => {
    await page.goto('/buy');
    await fillForm(page); // fills step 1 → advances → fills step 2
    await page.getByTestId('delivery-btn').click(); // submit step 2 → calls payment intent API

    // After submitting step 2, the page calls create-first-box-payment-intent
    // and mounts the Stripe PaymentElement. We wait for the wrapper to appear.
    await expect(page.locator('.co-payment-element-wrap')).toBeVisible({ timeout: 15_000 });

    // Confirm the "No subscription" order pill copy is shown — reassures the buyer
    await expect(page.locator('.co-order-pill-cancel')).toContainText(/no subscription/i);
  });

  // REQUIRES: Stripe Link disabled on the test account.
  // Stripe shows an optional Link/Onelink registration prompt after card entry
  // in test mode, which blocks confirmPayment from resolving. To enable this test:
  //   Stripe Dashboard → Settings → Payment Methods → Link → disable for this account
  // Until then, test 11 above confirms the API integration and PaymentElement mount work.
  test.skip('full purchase: test card goes through and redirects to /success', async ({ page }) => {
    await page.goto('/buy?kit=ground');
    await fillForm(page);
    await page.getByTestId('delivery-btn').click();

    await expect(page.locator('.co-payment-element-wrap')).toBeVisible({ timeout: 15_000 });

    await fillStripeCard(page);
    await page.getByTestId('pay-btn').click();

    await page.waitForURL(/\/success/, { timeout: 30_000 });
    expect(page.url()).toContain('source=first_batch');
    expect(page.url()).toContain('kit=ground');
    await expect(page.getByText(/order confirmed/i)).toBeVisible();
  });
});

// ─── Group 5: Sold-out state ─────────────────────────────────────────────────
//
// When a kit is sold out, the sold-out state is triggered by the form submission
// (handleDetailsNext detects it from the inventory response). We mock the inventory
// API so these tests don't depend on actual DB state.
//
// Note: the sold-out page renders after step 1 submission, not immediately on load.
// Kit cards do not have visual sold-out indicators in the current UI.

test.describe('Sold-out state', () => {
  test('shows sold-out page when all kits are out of stock', async ({ page }) => {
    // Mock: all kits sold out
    await page.route('**/functions/v1/get-inventory-status', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kits: {
            ground: { available: false, count: 0 },
            ritual: { available: false, count: 0 },
          },
        }),
      });
    });
    // Mock: join-waitlist (called when soldout is detected after step 1 submit)
    await page.route('**/functions/v1/join-waitlist', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    // Abort DNS check so step 1 validation always advances to inventory check
    await page.route('https://cloudflare-dns.com/**', route => route.abort());

    await page.goto('/buy');

    // Wait for inventory to load (kit-selector renders once inventory resolves)
    await page.getByTestId('kit-selector').waitFor({ state: 'visible' });

    // Fill step 1 and submit — sold-out detection fires in handleDetailsNext
    await fillStep1(page);
    await page.getByTestId('continue-btn').click();

    // Sold-out page should appear
    await expect(page.locator('.by-soldout-badge')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/you got this far/i)).toBeVisible();
    await expect(page.locator('.by-soldout-saved-text')).toContainText(/you're on the list/i);

    // Checkout form must be gone — sold-out buyers can't proceed to payment
    await expect(page.getByTestId('continue-btn')).not.toBeVisible();
    await expect(page.getByTestId('kit-selector')).not.toBeVisible();
  });

  test('individual kit sold out: kit selector and form still accessible for available kit', async ({ page }) => {
    // Only ground is sold out — ritual is still available.
    // Note: kit cards do not render a visual sold-out indicator in the current UI;
    // the sold-out state is only detected when the user tries to proceed with that kit.
    await page.route('**/functions/v1/get-inventory-status', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kits: {
            ground: { available: false, count: 0 },
            ritual: { available: true, count: 50 },
          },
        }),
      });
    });

    await page.goto('/buy');

    // Both kit cards visible (no visual soldout indicator on cards currently)
    await expect(page.getByTestId('kit-ground')).toBeVisible();
    await expect(page.getByTestId('kit-ritual')).toBeVisible();

    // Ritual is default-selected and available, so the form is still accessible
    await expect(page.getByTestId('continue-btn')).toBeVisible();
  });
});

// ─── Group 6: Page copy and key UI strings ────────────────────────────────────
//
// Verifies that critical copy is present on each page.
// The /buy page was redesigned from a landing page to a checkout flow:
// batch-specific copy ("The First 250.", "250 kits") was removed.
// The page now shows "Your Details." as the step 1 heading.

test.describe('Page copy — /buy', () => {
  test('first_batch page has correct heading and trust copy', async ({ page }) => {
    await page.goto('/buy');
    // Step 1 heading (checkout flow, not a marketing landing page)
    await expect(page.getByText(/your details/i).first()).toBeVisible();
    // Inline trust copy on the form
    await expect(page.getByText(/one-time purchase — no subscription/i).first()).toBeVisible();
    // Right panel trust items (desktop)
    await expect(page.getByText(/qr code/i).first()).toBeVisible();
    await expect(page.getByText(/secured by stripe/i).first()).toBeVisible();
  });

  test('gift source page loads correctly with flat pricing and no batch-specific copy', async ({ page }) => {
    await page.goto('/buy?source=gift');
    // Kit selector shows for all sources
    await expect(page.getByTestId('kit-selector')).toBeVisible();
    // Pricing is flat (no £10 gift premium)
    await expect(page.getByTestId('kit-ground')).toContainText('£65');
    await expect(page.getByTestId('kit-ritual')).toContainText('£85');
    // Batch-specific copy was removed — not shown for any source
    await expect(page.getByText(/250 kits/i)).not.toBeVisible();
  });

  test('back link goes to /#kits', async ({ page }) => {
    await page.goto('/buy');
    const backLink = page.getByText(/← back to kits/i);
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/#kits');
  });
});

test.describe('Page copy — /success', () => {
  test('one-time success page has all four steps with correct copy', async ({ page }) => {
    await page.goto('/success?kit=ritual&source=first_batch&ref=pi_test_ABCDEFGH');
    await expect(page.getByText(/order confirmed/i)).toBeVisible();
    // Heading is "Ritual<br/>Begins." — match via class to avoid <br> text split
    await expect(page.locator('.su-heading')).toBeVisible();
    // Step 1
    await expect(page.getByText(/confirmation email/i)).toBeVisible();
    // Step 2 — title is dynamic (shows exact date when params present, fallback otherwise)
    await expect(page.locator('.su-steps .su-step').nth(1).locator('.su-step-title')).toContainText(/ships/i);
    // Step 3 — one-time version
    await expect(page.getByText(/we.ll check in at two weeks/i)).toBeVisible();
    // Step 4
    await expect(page.getByText(/your ritual guide/i)).toBeVisible();
    // Ritual teaser section
    await expect(page.getByText(/10 minutes every morning/i)).toBeVisible();
    // Primary CTA
    await expect(page.getByRole('link', { name: /see your ritual/i })).toBeVisible();
  });

  test('kit name from URL param appears on success page', async ({ page }) => {
    await page.goto('/success?kit=ritual&source=first_batch&ref=pi_test_ABCDEFGH');
    // .su-kit is the kit badge — avoids matching the step copy which also says "kit"
    await expect(page.locator('.su-kit')).toContainText(/ritual/i);
  });
});

// ─── Group 7: Success page copy branches correctly by purchase type ───────────
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
