import { test, expect } from '@playwright/test';

test('homepage product card links to its product page', async ({ page }) => {
  await page.goto('/full');
  const card = page.locator('.product-card').first();
  // Use .prod-img-base to avoid strict-mode violation — each card now has two
  // images (.prod-img-base + .prod-img-hover) from the hover-to-model feature.
  await expect(card.locator('.prod-img-base')).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/product\/[a-z0-9-]+/);
});
