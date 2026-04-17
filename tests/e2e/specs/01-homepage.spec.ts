import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/full');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with all key sections', async ({ page }) => {
    await expect(page).toHaveTitle(/SOLUM/i);
    for (const id of ['truth', 'kits', 'products', 'ritual', 'subscription']) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
  });

  test('kit cards show correct names and prices', async ({ page }) => {
    const kits = page.locator('#kits');
    await kits.scrollIntoViewIfNeeded();
    await expect(kits.locator('.kit-name', { hasText: 'GROUND' }).first()).toBeVisible();
    await expect(kits.locator('.kit-name', { hasText: 'RITUAL' }).first()).toBeVisible();
    await expect(kits.locator('.kit-name', { hasText: 'SOVEREIGN' }).first()).toBeVisible();
    await expect(kits.getByText('£65').first()).toBeVisible();
    await expect(kits.getByText('£85').first()).toBeVisible();
    // SOVEREIGN is Coming Soon — price may not render
  });

  test('kit CTA navigates to checkout', async ({ page }) => {
    const kits = page.locator('#kits');
    await kits.scrollIntoViewIfNeeded();
    // CTAs may be buttons or links — find the RITUAL kit CTA by button text
    const cta = kits.getByRole('button', { name: /start with ritual/i }).first();
    await cta.click();
    await expect(page).toHaveURL(/\/checkout\?kit=ritual/, { timeout: 15_000 });
  });

  test('ritual section has Full Instructions link', async ({ page }) => {
    await page.locator('#ritual').scrollIntoViewIfNeeded();
    const link = page.getByRole('link', { name: /full instructions/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/ritual/);
  });
});
