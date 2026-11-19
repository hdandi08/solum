import { defineConfig, devices } from '@playwright/test';
const server = (port: number, supabaseUrl: string) => ({
  command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
  url: `http://127.0.0.1:${port}`, reuseExistingServer: false,
  env: { VITE_MULTI_KIT_CHECKOUT_ENABLED: 'false', VITE_SUPABASE_URL: supabaseUrl, VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_mock_only', VITE_SUPABASE_ANON_KEY: 'mock-only' },
});
export default defineConfig({
  testDir: './multi-kit-tests', testMatch: 'recovery.spec.ts', outputDir:'/tmp/solum-multi-kit-recovery-tests', timeout:30_000,
  webServer:[server(4176,'https://rodvvmfzkyjsqbufkjbc.supabase.co'),server(4177,'https://production-placeholder.supabase.co')],
  projects:[{name:'dev-flag-off',use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:4176'}},{name:'production-blocked',use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:4177'}}],
});
