import { test, expect } from '@playwright/test';
import { sellOutRitualKit, seedRitualStock, zeroAllRitualStock } from '../helpers/db-reset';

// ─── With stock (setup seeds 10 units before this spec runs) ──────────────────

test.describe('Checkout — with stock', () => {
  test('checkout page loads with ritual kit details', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/ritual/i).first()).toBeVisible();
  });

  test('checkout page loads with ground kit details', async ({ page }) => {
    await page.goto('/checkout?kit=ground');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/ground/i).first()).toBeVisible();
  });

  test('form validation — empty submit shows error message', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    await page.locator('button.co-submit').click();
    await expect(page.locator('.co-error').first()).toBeVisible({ timeout: 5000 });
  });

  test('form validation — invalid email shows error', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    await page.locator('input[placeholder="James"]').first().fill('Test');
    await page.locator('input[type="email"]').first().fill('notanemail');
    await page.locator('button.co-submit').click();
    await expect(page.locator('.co-error').first()).toBeVisible({ timeout: 5000 });
  });

  test('valid checkout redirects to Stripe', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');

    // Use a dedicated email that is never seeded as a customer — avoids the
    // "You already have a subscription" block that TEST_USER_EMAIL would trigger.
    await page.locator('input[placeholder="James"]').first().fill('Stripe');
    await page.locator('input[placeholder="Smith"]').fill('Test');
    await page.locator('input[type="email"]').first().fill('stripe-test@bysolum.com');
    await page.locator('input[placeholder="1990"]').fill('1990');
    await page.locator('input[placeholder="1–12"]').fill('6');

    await page.locator('button.co-submit').click();
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 20_000 });
  });

  test('Stripe test payment completes and lands on /success', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');

    await page.locator('input[placeholder="James"]').first().fill('Stripe');
    await page.locator('input[placeholder="Smith"]').fill('Test');
    await page.locator('input[type="email"]').first().fill('stripe-test@bysolum.com');
    await page.locator('input[placeholder="1990"]').fill('1990');
    await page.locator('input[placeholder="1–12"]').fill('6');
    await page.locator('button.co-submit').click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });

    // Stripe hosted checkout — use autocomplete attributes to target specific inputs
    await page.locator('input[autocomplete="shipping address-line1"], input[autocomplete="address-line1"]').fill('1 Test Street');
    await page.locator('input[autocomplete="shipping address-level2"], input[autocomplete="address-level2"]').fill('London');
    await page.locator('input[autocomplete="shipping postal-code"], input[autocomplete="postal-code"]').fill('SW1A 1AA');

    const cardFrame = page.frameLocator('iframe[name*="card"]').first();
    await cardFrame.locator('[placeholder*="1234"]').fill('4242424242424242');
    await cardFrame.locator('[placeholder*="MM"]').fill('1226');
    await cardFrame.locator('[placeholder*="CVC"]').fill('123');

    await page.getByRole('button', { name: /pay/i }).click();
    await expect(page).toHaveURL(/\/success/, { timeout: 30_000 });
    await expect(page.getByText(/order|confirmation|reference/i)).toBeVisible();
  });
});

// ─── Partial stock out (one product zero) ─────────────────────────────────────

test.describe('Checkout — one product sold out', () => {
  test.beforeEach(async () => {
    // Ensure stock is healthy, then zero out Argan Oil (unique to ritual/sovereign)
    await seedRitualStock(10);
    await sellOutRitualKit();
  });

  test.afterEach(async () => {
    await seedRitualStock(10);
  });

  test('ritual kit shows waitlist/sold-out when Argan Oil is zero', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.co-waitlist-eyebrow').first()).toBeVisible({ timeout: 10_000 });
  });

  test('ground kit (no Argan Oil) still shows checkout form', async ({ page }) => {
    // Ground kit does not include product-06, so it should remain available
    await page.goto('/checkout?kit=ground');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button.co-submit')).toBeVisible({ timeout: 10_000 });
  });
});

// ─── All stock zero (simulates freshly wiped / unseeded DB) ──────────────────

test.describe('Checkout — all stock zero', () => {
  test.beforeAll(async () => {
    await zeroAllRitualStock();
  });

  test.afterAll(async () => {
    await seedRitualStock(10);
  });

  test('ritual kit shows waitlist when all products are at zero stock', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.co-waitlist-eyebrow').first()).toBeVisible({ timeout: 10_000 });
  });

  test('ground kit shows waitlist when all products are at zero stock', async ({ page }) => {
    await page.goto('/checkout?kit=ground');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.co-waitlist-eyebrow').first()).toBeVisible({ timeout: 10_000 });
  });

  test('waitlist email form submits successfully', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.co-waitlist-eyebrow').first()).toBeVisible({ timeout: 10_000 });

    // Find and fill the waitlist email input if present
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('waitlist-test@bysolum.com');
      const submitBtn = page.getByRole('button', { name: /notify|join|submit|waitlist/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        // Expect some confirmation feedback
        await expect(page.getByText(/thank|we.ll.*email|we.ll.*notify|you.re on/i)).toBeVisible({ timeout: 10_000 });
      }
    }
  });
});
