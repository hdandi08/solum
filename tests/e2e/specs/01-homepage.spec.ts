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
    await page.locator('#kits').scrollIntoViewIfNeeded();
    await expect(page.getByText('GROUND')).toBeVisible();
    await expect(page.getByText('RITUAL')).toBeVisible();
    await expect(page.getByText('SOVEREIGN')).toBeVisible();
    await expect(page.getByText('£55')).toBeVisible();
    await expect(page.getByText('£85')).toBeVisible();
    await expect(page.getByText('£130')).toBeVisible();
  });

  test('kit CTA navigates to checkout', async ({ page }) => {
    await page.locator('#kits').scrollIntoViewIfNeeded();
    await page.getByRole('link', { name: /start with ritual/i }).first().click();
    await expect(page).toHaveURL(/\/checkout\?kit=ritual/);
  });

  test('ritual section has Full Instructions link', async ({ page }) => {
    await page.locator('#ritual').scrollIntoViewIfNeeded();
    const link = page.getByRole('link', { name: /full instructions/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/ritual/);
  });
});
