import { test, expect } from '@playwright/test';

// Ritual page is now a video selector (RitualVideoSelector): daily/weekly
// .rv-pill toggles — the selected pill gets .sel, the other .dim — and a video
// poster (.rv-poster) plays the ritual film. Above it, a two-tier system
// section (.rp-system) explains daily vs weekly.

test.describe('Ritual Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ritual');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with heading and two-tier system', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /the ritual/i }).first()).toBeVisible();
    await expect(page.locator('.rp-system')).toBeVisible();
    await expect(page.locator('.rp-tier.daily')).toBeVisible();
    await expect(page.locator('.rp-tier.weekly')).toBeVisible();
  });

  test('daily ritual selected by default, weekly dimmed', async ({ page }) => {
    await expect(page.locator('.rv-pill.daily.sel')).toBeVisible();
    await expect(page.locator('.rv-pill.weekly.dim')).toBeVisible();
  });

  test('selecting the weekly pill switches the active ritual', async ({ page }) => {
    await page.locator('.rv-pill.weekly').click();
    await expect(page.locator('.rv-pill.weekly.sel')).toBeVisible();
    await expect(page.locator('.rv-pill.daily.dim')).toBeVisible();
  });

  test('both ritual pills show titles and a video poster is present', async ({ page }) => {
    await expect(page.locator('.rv-pill.daily .rv-pill-title')).toContainText(/daily/i);
    await expect(page.locator('.rv-pill.weekly .rv-pill-title')).toContainText(/weekly/i);
    await expect(page.locator('.rv-poster').first()).toBeVisible();
  });
});
