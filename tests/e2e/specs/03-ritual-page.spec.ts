import { test, expect } from '@playwright/test';

test.describe('Ritual Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ritual');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page.getByText('How To Use SOLUM')).toBeVisible();
  });

  test('daily tab shows 5 step cards', async ({ page }) => {
    await page.getByRole('button', { name: /daily ritual/i }).click();
    const cards = page.locator('.rsc');
    await expect(cards).toHaveCount(5);
  });

  test('weekly tab shows 5 step cards', async ({ page }) => {
    await page.getByRole('button', { name: /weekly deep ritual/i }).click();
    const cards = page.locator('.rsc');
    await expect(cards).toHaveCount(5);
  });

  test('switching tabs changes content', async ({ page }) => {
    await page.getByRole('button', { name: /daily ritual/i }).click();
    const dailyFirst = await page.locator('.rsc-name').first().textContent();

    await page.getByRole('button', { name: /weekly deep ritual/i }).click();
    const weeklyFirst = await page.locator('.rsc-name').first().textContent();

    expect(dailyFirst).not.toEqual(weeklyFirst);
  });

  test('each step card has video placeholder, instructions, and tip', async ({ page }) => {
    const firstCard = page.locator('.rsc').first();
    await expect(firstCard.locator('.rvp')).toBeVisible();           // video placeholder
    await expect(firstCard.locator('.rsc-step-row').first()).toBeVisible(); // instructions
    await expect(firstCard.locator('.rsc-tip')).toBeVisible();       // tip block
  });
});
