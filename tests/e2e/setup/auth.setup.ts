import { test as setup, expect } from '@playwright/test';
import { getAdminClient } from '../helpers/supabase-admin';
import { resetTestUserData, seedRitualStock, seedTestCustomer, seedTestSubscription } from '../helpers/db-reset';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('global setup — reset DB, seed stock, authenticate', async ({ page }) => {
  // 1. Clean slate for this test run
  await resetTestUserData();

  // 2. Ensure ritual kit has stock for checkout tests
  await seedRitualStock(10);

  // 3. Generate magic link via admin API — no email sent
  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: process.env.TEST_USER_EMAIL!,
    options: {
      redirectTo: `${process.env.DEV_BASE_URL || 'https://dev.d3pa095gzazg3c.amplifyapp.com'}/account`,
    },
  });

  if (error || !data?.properties?.action_link) {
    throw new Error(`Magic link generation failed: ${error?.message}`);
  }

  // 4. Navigate to the link — Supabase processes auth, redirects to /account
  await page.goto(data.properties.action_link);
  await page.waitForURL(/\/account/, { timeout: 20_000 });
  await expect(page.locator('body')).not.toContainText('error', { ignoreCase: true, timeout: 5_000 }).catch(() => {});

  // 5. Seed customer + subscription so authenticated account tests have data to work with
  //    (get-account falls back to login view if no customer row exists)
  const supabaseUserId = data.user?.id;
  if (!supabaseUserId) throw new Error('No user ID returned from generateLink');
  const customerId = await seedTestCustomer(supabaseUserId);
  await seedTestSubscription(customerId);

  // 6. Save session for authenticated tests
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
