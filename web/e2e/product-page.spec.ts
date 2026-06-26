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

// Regression: navigating prev/next between two film products must reload the hero video
// to the new product's film (a <video> reused across routes keeps playing the old source).
test('hero video reloads to the new product when navigating prev/next', async ({ page }) => {
  await page.goto('/product/07-body-lotion');
  const loadedSrc = () =>
    page.locator('.pp-hero video').evaluate((v: HTMLVideoElement) => v.currentSrc);
  // Film URLs are now CDN paths: /video/products/07_720.{webm,mp4}
  await expect.poll(loadedSrc, { timeout: 10_000 }).toContain('/video/products/07_720');
  await page.getByRole('link', { name: /argan body oil/i }).first().click();
  await expect(page).toHaveURL(/06-argan-oil/);
  // the hero video must now be playing the argan (06) film, not the lotion (07) film
  // key={slug} on the <video> element forces React to remount it with the new sources.
  await expect.poll(loadedSrc, { timeout: 10_000 }).toContain('/video/products/06_720');
});
