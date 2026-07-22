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
      await expect(page.locator(`#${sectionId}`)).toBeInViewport({ ratio: 0.2 });
    }
  });

  test('"The Ritual" nav link goes to /ritual page', async ({ page }) => {
    await page.goto('/full');
    await page.getByRole('navigation').getByRole('link', { name: 'The Ritual', exact: true }).click();
    await expect(page).toHaveURL(/\/ritual/);
  });

  test('from /ritual — hash nav links go home and scroll', async ({ page }) => {
    await page.goto('/ritual');
    await page.waitForLoadState('networkidle');

    // Off the homepage, hash links resolve to /#<section> (home is "/", not "/full")
    await page.locator('.nav-links').getByRole('link', { name: 'Kits', exact: true }).click();
    await expect(page).toHaveURL(/\/#kits/);
    await page.waitForTimeout(600);
    await expect(page.locator('#kits')).toBeInViewport({ ratio: 0.2 });
  });

  test('SOLUM logo on /ritual goes home', async ({ page }) => {
    await page.goto('/ritual');
    await page.locator('.solum-wordmark').click();
    await expect(page).toHaveURL(/\/(#home)?$/);
  });

  test('nav CTA on /ritual goes to kits', async ({ page }) => {
    await page.goto('/ritual');
    // Label varies (e.g. "Build Your Ritual") — target by class, assert destination
    await page.locator('.nav-cta').click();
    await expect(page).toHaveURL(/\/#kits/);
  });
});
