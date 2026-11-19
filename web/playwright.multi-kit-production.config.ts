import { defineConfig, devices } from '@playwright/test';
// All provider requests are intercepted by the checkout fixture.
export default defineConfig({
  testDir:'./multi-kit-tests',testIgnore:'recovery.spec.ts',outputDir:'/tmp/solum-production-multi-kit-tests',timeout:30000,
  use:{baseURL:'http://127.0.0.1:4185',screenshot:'only-on-failure'},
  webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4185 --strictPort',url:'http://127.0.0.1:4185',reuseExistingServer:false,env:{VITE_MULTI_KIT_CHECKOUT_ENABLED:'true',VITE_SUPABASE_URL:'https://gvfptmjluxpngfjendbi.supabase.co',VITE_STRIPE_PUBLISHABLE_KEY:'pk_live_mock_only',VITE_SUPABASE_ANON_KEY:'mock-only'}},
  projects:[{name:'production-desktop',use:{...devices['Desktop Chrome']}},{name:'production-mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],
});
