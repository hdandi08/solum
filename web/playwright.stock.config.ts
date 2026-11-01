import { defineConfig, devices } from '@playwright/test';

// Isolated browser tests: no inventory seeding, database cleanup, or real payment.
export default defineConfig({
  testDir: './stock-tests',
  outputDir: '/tmp/solum-stock-tests',
  timeout: 30_000,
  use: { baseURL: process.env.STOCK_TEST_URL || 'http://127.0.0.1:4174', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
});
