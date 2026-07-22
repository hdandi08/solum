import { test, expect } from '@playwright/test';

// /checkout (subscription flow) is now multi-step:
//   details (name/email/phone/DOB) → delivery (address) →
//   ground only: upgrade/addon interstitial (.co-overlay-step) →
//   inline Stripe Payment Element (no checkout.stripe.com redirect).
// Ritual skips the interstitial and goes straight to payment.

// Unique gmail address per run: passes the delivery-step MX/DNS check and
// avoids "existing_subscriber" 409s from re-used emails.
const freshEmail = () => `e2e+${Date.now()}${Math.floor(Math.random() * 1e4)}@gmail.com`;

async function fillDetails(page: any, email: string) {
  await page.locator('input[placeholder="James"]').fill('Stripe');
  await page.locator('input[placeholder="Smith"]').fill('Test');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="tel"]').fill('07700900000');
  await page.locator('select').first().selectOption({ index: 6 }); // any valid birth month
  await page.locator('input[placeholder="1990"]').fill('1990');
  await page.locator('button.co-submit').click();
}

async function fillDelivery(page: any) {
  await page.locator('input[placeholder="14 Example Street"]').fill('1 Test Street');
  await page.locator('input[placeholder="London"]').fill('London');
  await page.locator('input[placeholder="SW1A 1AA"]').fill('SW1A 1AA');
  await page.locator('button.co-submit').click();
}

test.describe('Checkout — with stock', () => {
  test('ritual checkout loads on the details step', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[placeholder="James"]')).toBeVisible();
  });

  test('ground checkout loads on the details step', async ({ page }) => {
    await page.goto('/checkout?kit=ground');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[placeholder="James"]')).toBeVisible();
  });

  test('ground shows the RITUAL upgrade nudge', async ({ page }) => {
    await page.goto('/checkout?kit=ground');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.co-upgrade')).toBeVisible();
    await expect(page.locator('.co-upgrade')).toContainText(/ritual/i);
  });

  test('ritual shows no upgrade nudge', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.co-upgrade')).toHaveCount(0);
  });

  test('empty details submit shows an error', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    await page.locator('button.co-submit').click();
    await expect(page.locator('.co-error').first()).toBeVisible({ timeout: 5000 });
  });

  test('ritual — details + delivery reaches the inline Stripe payment step', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    await fillDetails(page, freshEmail());
    await expect(page.locator('input[placeholder="14 Example Street"]')).toBeVisible({ timeout: 10_000 });
    await fillDelivery(page);
    // Stripe Payment Element mounts inline — no redirect to checkout.stripe.com
    await expect(page.locator('iframe[name^="__privateStripeFrame"]').first()).toBeAttached({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/checkout\.stripe\.com/);
  });
});

test.describe('Checkout — GROUND interstitial', () => {
  test('ground delivery opens the RITUAL upgrade interstitial', async ({ page }) => {
    await page.goto('/checkout?kit=ground');
    await page.waitForLoadState('networkidle');
    await fillDetails(page, freshEmail());
    await expect(page.locator('input[placeholder="14 Example Street"]')).toBeVisible({ timeout: 10_000 });
    await fillDelivery(page);
    await expect(page.locator('.co-overlay-step')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.co-overlay-title')).toContainText(/upgrade/i);
    await expect(page).not.toHaveURL(/stripe\.com/);
  });

  test('declining the upgrade offers the mixing bowl add-on', async ({ page }) => {
    await page.goto('/checkout?kit=ground');
    await page.waitForLoadState('networkidle');
    await fillDetails(page, freshEmail());
    await expect(page.locator('input[placeholder="14 Example Street"]')).toBeVisible({ timeout: 10_000 });
    await fillDelivery(page);
    await expect(page.locator('.co-overlay-step')).toBeVisible({ timeout: 10_000 });
    await page.locator('.co-overlay-btn-secondary').click(); // "No thanks, stay with GROUND" → addon
    await expect(page.locator('.co-overlay-title')).toContainText(/mixing/i);
    await expect(page.locator('.co-overlay-addon-price')).toContainText('£10');
  });
});

// NOTE: sold-out / waitlist coverage intentionally omitted here. On /checkout
// (the dormant subscription flow) the waitlist is driven by get-inventory-status
// reading the kit_inventory table, whereas the seed helpers write the products
// table — and CheckoutPage compares an object `!== false` (always true). The
// live sold-out path is on /buy; the /checkout waitlist mismatch is flagged
// separately for investigation.
