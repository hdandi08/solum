import { defineConfig, devices } from '@playwright/test';
import { assertSafeE2ETarget } from '../scripts/e2e-safety.mjs';

const isCI    = !!process.env.CI;
const baseURL = process.env.DEV_BASE_URL ?? 'http://localhost:5173';
const supabaseURL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;

assertSafeE2ETarget({
  target: process.env.E2E_TARGET,
  baseURL,
  supabaseURL,
  stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY,
  localServer: !isCI,
});

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },

  // Runs once before all tests: seeds inventory, clears test data.
  // Local: needs web/.env.test with SUPABASE_SERVICE_ROLE_KEY (see .env.test.example).
  // CI: keys come from SSM via buildspec env vars — no .env.test needed.
  globalSetup: './e2e/global-setup.ts',

  // Retry once on CI to absorb transient network blips.
  retries: isCI ? 1 : 0,

  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // In CI the tests run against the deployed dev site — no local server needed.
  // Locally: starts Vite dev server and reuses it if already running.
  webServer: isCI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
