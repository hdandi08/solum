import { test, expect } from '@playwright/test';

test('product page renders hero + name + gallery', async ({ page }) => {
  await page.goto('/product/01-body-wash');
  await expect(page.getByRole('heading', { name: /body wash/i })).toBeVisible();
  await expect(page.locator('.pp-hero')).toBeVisible();
  await expect(page.locator('.pp-gallery img').first()).toBeVisible();
});

test('unknown product slug shows not found', async ({ page }) => {
  await page.goto('/product/does-not-exist');
  await expect(page.getByText(/not found/i)).toBeVisible();
});
