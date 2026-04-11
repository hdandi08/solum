import { test, expect } from '@playwright/test';

// All tests in this file use the saved auth session from setup/auth.setup.ts

test.describe('Account — unauthenticated', () => {
  test('shows login form without a session', async ({ browser }) => {
    // browser.newContext() inherits the project-level storageState from playwright.config.ts
    // unless explicitly overridden — pass empty state to get a truly unauthenticated context.
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto('/account');
    // Wait for the login email input — unique to LoginView, confirms we're not on the dashboard
    await expect(page.locator('input[placeholder="your@email.com"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /send.*link/i })).toBeVisible();
    await ctx.close();
  });
});

test.describe('Account — authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    // Wait for dashboard to load (not the login/loading view)
    await expect(page.locator('.ac-heading')).toBeVisible({ timeout: 10_000 });
  });

  test('dashboard loads with user info', async ({ page }) => {
    // Heading shows "Your Account." and greeting shows seeded first name
    await expect(page.getByText(/your account/i)).toBeVisible();
    await expect(page.getByText(/hello.*test/i)).toBeVisible();
  });

  test('subscription panel is visible with active status', async ({ page }) => {
    // Subscription panel label is always rendered
    await expect(page.getByText('Subscription').first()).toBeVisible();
    // Setup seeds an active ritual subscription
    await expect(page.locator('.ac-badge-active')).toBeVisible();
  });

  test('address panel is visible and Add button opens form', async ({ page }) => {
    // "Shipping Address" panel label
    await expect(page.locator('.ac-panel-label', { hasText: 'Shipping Address' })).toBeVisible();
    // Click Add to open the address form — target the panel header button specifically
    await page.locator('.ac-panel-head').filter({ hasText: 'Shipping Address' }).getByRole('button').click();
    // Address form inputs should now be visible
    await expect(page.locator('input.ac-form-input').first()).toBeVisible({ timeout: 5_000 });
  });

  test('cancel subscription button opens confirmation', async ({ page }) => {
    // Setup seeds an active subscription so this panel renders
    const cancelBtn = page.getByRole('button', { name: /cancel subscription/i });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    // Confirmation box appears with the "Yes, cancel" danger button
    await expect(page.getByRole('button', { name: /yes.*cancel/i })).toBeVisible();
  });
});
