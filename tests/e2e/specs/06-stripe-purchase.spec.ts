import { test, expect } from '@playwright/test';

// Full multi-step /checkout reaches the INLINE Stripe payment step — no
// checkout.stripe.com redirect. We assert a *payable* element renders (Payment
// Element + terms + Pay button). Actual card entry + payment completion is
// verified manually: Stripe's Payment Element inner iframes are unreliable to
// drive headless in CI (the team's prior end-to-end card test was skipped for
// the same reason).

const freshEmail = () => `stripe-e2e-${Date.now()}${Math.floor(Math.random() * 1e4)}@bysolum.com`;

async function fillDetails(page: any, email: string) {
  await page.locator('input[placeholder="James"]').fill('Stripe');
  await page.locator('input[placeholder="Smith"]').fill('Test');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="tel"]').fill('07700900000');
  await page.locator('select').first().selectOption({ index: 6 });
  await page.locator('input[placeholder="1990"]').fill('1990');
  await page.locator('button.co-submit').click();
}

async function fillDelivery(page: any) {
  await page.locator('input[placeholder="14 Example Street"]').fill('1 Test Street');
  await page.locator('input[placeholder="London"]').fill('London');
  await page.locator('input[placeholder="SW1A 1AA"]').fill('SW1A 1AA');
  await page.locator('button.co-submit').click();
}

test.describe('Stripe purchase → inline payment step', () => {
  test.setTimeout(90_000);

  test('ritual checkout reaches a payable inline Stripe element', async ({ page }) => {
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    await fillDetails(page, freshEmail());
    await expect(page.locator('input[placeholder="14 Example Street"]')).toBeVisible({ timeout: 10_000 });
    await fillDelivery(page);

    // Inline Stripe Payment Element mounts on our domain — not a hosted redirect
    await expect(page.locator('iframe[src*="elements-inner"]').first()).toBeAttached({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/checkout\.stripe\.com/);

    // Payable UI is present: terms consent + Pay button with an amount
    await expect(page.locator('.co-terms-check input[type="checkbox"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /pay £\d+ now/i })).toBeVisible();
  });
});
