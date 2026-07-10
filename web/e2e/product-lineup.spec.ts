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

test('tiles show transformation line and stat pill', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('.product-card', { hasText: 'Scalp Massager' });
  await expect(tile.locator('.prod-transform')).toContainText('Itchy, flaky scalp');
  await expect(tile.locator('.prod-transform')).toContainText('clean scalp, thicker hair');
  await expect(tile.locator('.prod-statpill')).toContainText('+120%');
});
