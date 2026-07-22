import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/full');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with all key sections', async ({ page }) => {
    await expect(page).toHaveTitle(/SOLUM/i);
    for (const id of ['problem', 'kits', 'products', 'ritual', 'system']) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
  });

  test('kit cards show correct names and prices', async ({ page }) => {
    const kits = page.locator('#kits');
    await kits.scrollIntoViewIfNeeded();
    // Two live kits only — SOVEREIGN is coming-soon and not shown as a kit card.
    await expect(kits.locator('.kit-name', { hasText: 'GROUND' }).first()).toBeVisible();
    await expect(kits.locator('.kit-name', { hasText: 'RITUAL' }).first()).toBeVisible();
    await expect(kits.getByText('£65').first()).toBeVisible();
    await expect(kits.getByText('£85').first()).toBeVisible();
  });

  test('kit CTA navigates to /buy', async ({ page }) => {
    const kits = page.locator('#kits');
    await kits.scrollIntoViewIfNeeded();
    // CTAs are buttons that navigate programmatically to the one-time /buy flow.
    const cta = kits.getByRole('button', { name: /get ritual/i }).first();
    await cta.click();
    await expect(page).toHaveURL(/\/buy\?kit=ritual/, { timeout: 15_000 });
  });

  test('a ritual link navigates to /ritual', async ({ page }) => {
    const link = page.locator('a[href="/ritual"]').first();
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/ritual/);
  });
});
