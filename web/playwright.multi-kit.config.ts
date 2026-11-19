import { defineConfig, devices } from '@playwright/test';
// Every provider request is mocked; no inventory mutation or real payment.
export default defineConfig({
  testDir: './multi-kit-tests', testIgnore: 'recovery.spec.ts', outputDir: '/tmp/solum-multi-kit-tests', timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4175', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175', reuseExistingServer: false,
    env: { VITE_MULTI_KIT_CHECKOUT_ENABLED: 'true', VITE_SUPABASE_URL: 'https://rodvvmfzkyjsqbufkjbc.supabase.co', VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_mock_only', VITE_SUPABASE_ANON_KEY: 'mock-only' },
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
});
