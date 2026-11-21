import {defineConfig} from '@playwright/test';
import base from './playwright.meta-promo.config';
// Local production configuration only. The fixture intercepts all provider calls.
export default defineConfig({
 ...base,
 metadata:{production:true},
 outputDir:'/tmp/solum-production-meta-promo-tests',
 webServer:{...base.webServer,env:{...base.webServer.env,VITE_SUPABASE_URL:'https://gvfptmjluxpngfjendbi.supabase.co',VITE_STRIPE_PUBLISHABLE_KEY:'pk_live_mock_only'}},
});
