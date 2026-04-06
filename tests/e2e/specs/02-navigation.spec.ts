import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('nav links on /full scroll to correct sections', async ({ page }) => {
    await page.goto('/full');
    await page.waitForLoadState('networkidle');

    for (const [label, sectionId] of [
      ['Kits', 'kits'],
      ['Products', 'products'],
    ]) {
      await page.getByRole('link', { name: label, exact: true }).click();
      await page.waitForTimeout(600); // scroll animation
      const section = page.locator(`#${sectionId}`);
      await expect(section).toBeInViewport({ ratio: 0.2 });
    }
  });

  test('"The Ritual" nav link goes to /ritual page', async ({ page }) => {
    await page.goto('/full');
    await page.getByRole('navigation').getByRole('link', { name: 'The Ritual', exact: true }).click();
    await expect(page).toHaveURL(/\/ritual/);
  });

  test('from /ritual — hash nav links go to /full and scroll', async ({ page }) => {
    await page.goto('/ritual');
    await page.waitForLoadState('networkidle');

    await page.getByRole('link', { name: 'Kits', exact: true }).click();
    await expect(page).toHaveURL(/\/full#kits/);
    await page.waitForTimeout(600);
    await expect(page.locator('#kits')).toBeInViewport({ ratio: 0.2 });
  });

  test('SOLUM logo on /ritual goes to /full', async ({ page }) => {
    await page.goto('/ritual');
    await page.getByRole('navigation').locator('.nav-logo').click();
    await expect(page).toHaveURL(/\/full/);
  });

  test('"Choose Your Kit" CTA on /ritual goes to /full#kits', async ({ page }) => {
    await page.goto('/ritual');
    await page.getByRole('link', { name: /choose your kit/i }).first().click();
    await expect(page).toHaveURL(/\/full#kits/);
  });
});
