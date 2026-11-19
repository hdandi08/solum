import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./meta-promo-tests',outputDir:'/tmp/solum-meta-promo-tests',timeout:35000,
 use:{baseURL:'http://127.0.0.1:4190',screenshot:'only-on-failure'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4190 --strictPort',url:'http://127.0.0.1:4190',reuseExistingServer:false,env:{VITE_META_PROMO_ENABLED:'true',VITE_MULTI_KIT_CHECKOUT_ENABLED:'true',VITE_SUPABASE_URL:'https://rodvvmfzkyjsqbufkjbc.supabase.co',VITE_STRIPE_PUBLISHABLE_KEY:'pk_test_mock_only',VITE_SUPABASE_ANON_KEY:'mock-only'}},
 projects:[{name:'desktop',use:{viewport:{width:1280,height:900}}},{name:'small-mobile',use:{viewport:{width:320,height:740},isMobile:true,hasTouch:true}},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
});
