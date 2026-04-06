import { test, expect } from '@playwright/test';

// All tests in this file use the saved auth session from setup/auth.setup.ts

test.describe('Account — unauthenticated', () => {
  test('shows login form without a session', async ({ browser }) => {
    // Use a fresh context with no auth state
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /send link|sign in|magic link/i })).toBeVisible();
    await ctx.close();
  });
});

test.describe('Account — authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
  });

  test('dashboard loads with user info', async ({ page }) => {
    // Should not show login form
    await expect(page.getByRole('button', { name: /send link|sign in/i })).not.toBeVisible();
    // Should show account content
    await expect(page.getByText(/harsha|bysolum/i)).toBeVisible();
  });

  test('address form is present', async ({ page }) => {
    await expect(page.getByLabel(/address|street/i).first()).toBeVisible();
  });

  test('subscription section is visible', async ({ page }) => {
    await expect(page.getByText(/subscription|plan|kit/i).first()).toBeVisible();
  });

  test('cancel subscription button exists', async ({ page }) => {
    const cancelBtn = page.getByRole('button', { name: /cancel/i });
    await expect(cancelBtn).toBeVisible();
    // Click to open confirmation — do NOT confirm (we don't want to cancel)
    await cancelBtn.click();
    await expect(page.getByText(/are you sure|confirm|cancel your/i)).toBeVisible();
  });
});
