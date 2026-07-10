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

test('system section replaces reviews and products precede ritual', async ({ page }) => {
  await page.goto('/');
  const system = page.locator('#system');
  await expect(system).toBeVisible();
  await expect(system).toContainText('Nobody ever gave you');
  await expect(system).toContainText('The SOLUM system · 10 minutes');
  await expect(system.locator('.system-cta .btn-primary')).toHaveText('Get the system');
  // Reviews section gone (Reviews.jsx's root class is .reviews-section)
  await expect(page.locator('.reviews-section')).toHaveCount(0);
  // Products section appears before the ritual section in DOM order
  const order = await page.evaluate(() => {
    const products = document.querySelector('#products');
    const ritual = document.querySelector('#ritual');
    if (!products || !ritual) return 'missing';
    return products.compareDocumentPosition(ritual) & Node.DOCUMENT_POSITION_FOLLOWING ? 'products-first' : 'ritual-first';
  });
  expect(order).toBe('products-first');
});

test('homepage kit card product list shows outcome lines after expanding', async ({ page }) => {
  await page.goto('/');
  await page.locator('.kit-products-toggle').first().click();
  await expect(page.locator('.kit-product-outcome', { hasText: 'clean scalp, thicker hair' }).first()).toBeVisible();
});
