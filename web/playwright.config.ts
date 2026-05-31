import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },

  // Runs once before all tests: seeds inventory, clears test data.
  // Requires web/.env.test with SUPABASE_SERVICE_ROLE_KEY — see .env.test.example.
  globalSetup: './e2e/global-setup.ts',

  // Retry once on CI so a transient network hiccup doesn't fail the run.
  // No retries locally — if a test is flaky you want to know immediately.
  retries: process.env.CI ? 1 : 0,

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Start the Vite dev server automatically.
  // If you already have it running (local dev), it reuses it.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
