import { test, expect } from '@playwright/test';

// Ritual page was overhauled to a chooser-first pattern:
//   /ritual → RitualChooser (pick daily or weekly card)
//   → daily: RitualDailyGuide (.rdg-step cards, shared video at top)
//   → weekly: RitualStepList (.rsc cards via RitualStepCard, per-step .rvp video)

test.describe('Ritual Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ritual');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with chooser heading', async ({ page }) => {
    await expect(page.locator('.rc-heading')).toBeVisible();
    await expect(page.locator('.rc-heading')).toContainText(/choose your ritual/i);
  });

  test('daily card opens 3 step guide', async ({ page }) => {
    await page.locator('.rc-card-daily').click();
    await page.waitForLoadState('networkidle');
    // RitualDailyGuide renders 3 .rdg-step cards (scalp, body, seal)
    await expect(page.locator('.rdg-step')).toHaveCount(3, { timeout: 10_000 });
  });

  test('weekly card opens 4 step guide', async ({ page }) => {
    await page.locator('.rc-card-weekly').click();
    await page.waitForLoadState('networkidle');
    // RitualStepList renders 4 .rsc cards (clay, scalp-oil, scrub, argan)
    await expect(page.locator('.rsc')).toHaveCount(4, { timeout: 10_000 });
  });

  test('switching rituals changes bar label', async ({ page }) => {
    await page.locator('.rc-card-daily').click();
    const dailyLabel = await page.locator('.ritual-bar-label').textContent();

    // ← Switch goes back to chooser
    await page.locator('.ritual-back').click();

    await page.locator('.rc-card-weekly').click();
    const weeklyLabel = await page.locator('.ritual-bar-label').textContent();

    expect(dailyLabel).not.toEqual(weeklyLabel);
  });

  test('weekly step cards have video placeholder, instructions, and tip', async ({ page }) => {
    await page.locator('.rc-card-weekly').click();
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('.rsc').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    // RitualVideoPlaceholder wraps in .rvp
    await expect(firstCard.locator('.rvp')).toBeVisible();
    // Instructions rendered as .rsc-step-row rows
    await expect(firstCard.locator('.rsc-step-row').first()).toBeVisible();
    // Tip block — present for all weekly steps that have detail.tip
    await expect(firstCard.locator('.rsc-tip')).toBeVisible();
  });
});
