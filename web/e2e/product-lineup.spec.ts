import { test, expect } from '@playwright/test';

test('homepage product card links to its product page', async ({ page }) => {
  await page.goto('/full');
  const card = page.locator('.product-card').first();
  await expect(card.locator('img')).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/product\/[a-z0-9-]+/);
});
