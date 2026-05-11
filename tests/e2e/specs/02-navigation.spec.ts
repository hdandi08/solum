import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('nav links on /full scroll to correct sections', async ({ page }) => {
    await page.goto('/full');
    await page.waitForLoadState('networkidle');

    for (const [label, sectionId] of [
      ['Kits', 'kits'],
      ['Products', 'products'],
    ]) {
      // Scope to desktop nav only — mobile drawer renders duplicate links
      await page.locator('.nav-links').getByRole('link', { name: label, exact: true }).click();
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

    // Scope to desktop nav — mobile drawer has a duplicate link
    await page.locator('.nav-links').getByRole('link', { name: 'Kits', exact: true }).click();
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
    // Use class selector — label varies by A/B variant (hero-cta-copy)
    await page.locator('.nav-cta').click();
    await expect(page).toHaveURL(/\/full#kits/);
  });
});
