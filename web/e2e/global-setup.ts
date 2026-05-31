/**
 * Playwright global setup — runs once before all tests.
 *
 * What it does:
 *   1. Loads .env.test (service role key, etc.) — gitignored, must exist locally
 *   2. Resets kit_inventory to 250 for both kits so tests always start with stock
 *   3. Cleans up test leads/emails from previous runs
 *
 * Required: web/.env.test (gitignored) containing:
 *   VITE_SUPABASE_URL=https://rodvvmfzkyjsqbufkjbc.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard → Settings → API>
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

export default async function globalSetup() {
  // Playwright runs from the web/ directory — use cwd() not __dirname
  const root = process.cwd();

  // Load .env.test first (service role key lives here, not in .env.local)
  const envTestPath = path.join(root, '.env.test');
  if (fs.existsSync(envTestPath)) {
    dotenv.config({ path: envTestPath });
  }
  // Also load .env.local so VITE_SUPABASE_URL etc. are available
  const envLocalPath = path.join(root, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
  }

  // Accept VITE_SUPABASE_URL (local .env.local) or SUPABASE_URL (CI buildspec)
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      '\n\nE2E global setup: missing environment variables.\n' +
      'Create web/.env.test (already in .gitignore) with:\n\n' +
      '  VITE_SUPABASE_URL=https://rodvvmfzkyjsqbufkjbc.supabase.co\n' +
      '  SUPABASE_SERVICE_ROLE_KEY=<Settings → API → service_role in Supabase dashboard>\n\n'
    );
  }

  const db = createClient(supabaseUrl, serviceKey);

  // ── 1. Reset kit inventory ──────────────────────────────────────────────
  // Tests need available stock. Without this, a previous test run that went
  // through purchase would have decremented counts and broken the next run.
  const { error: invErr } = await db.from('kit_inventory').upsert([
    { kit_id: 'ground', available_count: 250 },
    { kit_id: 'ritual', available_count: 250 },
  ], { onConflict: 'kit_id' });

  if (invErr) throw new Error(`[e2e setup] inventory seed failed: ${invErr.message}`);

  // ── 2. Clean up test data from previous runs ────────────────────────────
  // Test runs use emails matching e2e+*@bysolum.com. Delete leads so upserts
  // don't collide and orders/customers don't accumulate noise.
  await db.from('leads').delete().like('email', 'e2e+%@bysolum.com');

  // Clean customers created by test runs (orders cascade from customers)
  const { data: testCustomers } = await db
    .from('customers')
    .select('id')
    .like('email', 'e2e+%@bysolum.com');

  if (testCustomers?.length) {
    const ids = testCustomers.map(c => c.id);
    await db.from('orders').delete().in('customer_id', ids);
    await db.from('customers').delete().in('id', ids);
  }

  console.log('✓ [e2e setup] kit_inventory: ground=250, ritual=250');
  console.log('✓ [e2e setup] test leads/customers/orders cleared');
}
