import { test, expect } from '@playwright/test';
import { sellOutRitualKit, seedRitualStock } from '../helpers/db-reset';

test.describe('Checkout', () => {
  test('checkout page loads with ritual kit details', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/ritual/i).first()).toBeVisible();
  });

  test('form validation — empty submit shows error message', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    // The form uses custom JS validation — clicking submit with empty fields shows an error div
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

  test('sold-out kit shows waitlist form', async ({ page }) => {
    await sellOutRitualKit();
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/waitlist|sold out|notify/i)).toBeVisible({ timeout: 10_000 });
    // Restore stock
    await seedRitualStock(10);
  });

  test('valid checkout redirects to Stripe', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');

    const email = process.env.TEST_USER_EMAIL ?? 'harsha@bysolum.com';
    await page.locator('input[placeholder="James"]').first().fill('Harsha');
    await page.locator('input[placeholder="Smith"]').fill('Test');
    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[placeholder="1990"]').fill('1990');
    await page.locator('input[placeholder="1–12"]').fill('6');

    await page.locator('button.co-submit').click();
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 20_000 });
  });

  test('Stripe test payment completes and lands on /success', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');

    const email = process.env.TEST_USER_EMAIL ?? 'harsha@bysolum.com';
    await page.locator('input[placeholder="James"]').first().fill('Harsha');
    await page.locator('input[placeholder="Smith"]').fill('Test');
    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[placeholder="1990"]').fill('1990');
    await page.locator('input[placeholder="1–12"]').fill('6');
    await page.locator('button.co-submit').click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });

    // Fill shipping address on Stripe
    await page.getByLabel(/address/i).first().fill('1 Test Street');
    await page.getByLabel(/city/i).fill('London');
    await page.getByLabel(/postcode|postal/i).fill('SW1A 1AA');

    // Fill card details (Stripe hosted checkout uses iframes for card fields)
    const cardFrame = page.frameLocator('iframe[name*="card"]').first();
    await cardFrame.locator('[placeholder*="1234"]').fill('4242424242424242');
    await cardFrame.locator('[placeholder*="MM"]').fill('1226');
    await cardFrame.locator('[placeholder*="CVC"]').fill('123');

    await page.getByRole('button', { name: /pay/i }).click();
    await expect(page).toHaveURL(/\/success/, { timeout: 30_000 });
    await expect(page.getByText(/order|confirmation|reference/i)).toBeVisible();
  });
});
