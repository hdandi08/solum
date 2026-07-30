import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  assertSafeE2ETarget,
  isCIEnvironment,
} from '../../../scripts/e2e-safety.mjs';
import { loadE2EEnvironment } from './load-e2e-environment';

const TEST_EMAIL_PATTERN = 'e2e+%@%';

export function createSafeE2EAdminClient() {
  loadE2EEnvironment();

  const isCI = isCIEnvironment();
  const baseURL = process.env.DEV_BASE_URL ?? 'http://localhost:5173';
  const supabaseURL =
    process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;

  assertSafeE2ETarget({
    target: process.env.E2E_TARGET,
    baseURL,
    supabaseURL,
    stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY,
    localServer: !isCI,
  });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseURL || !serviceKey) {
    throw new Error(
      'E2E development credentials required: missing Supabase URL or service-role key',
    );
  }

  return createClient(supabaseURL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function resetE2EData(db: SupabaseClient) {
  const { error: leadDeleteError } = await db
    .from('leads')
    .delete()
    .like('email', TEST_EMAIL_PATTERN);
  if (leadDeleteError) {
    throw new Error(
      `[e2e reset] lead cleanup failed: ${leadDeleteError.message}`,
    );
  }

  const { data: customers, error: customerLookupError } = await db
    .from('customers')
    .select('id')
    .like('email', TEST_EMAIL_PATTERN);
  if (customerLookupError) {
    throw new Error(
      `[e2e reset] customer lookup failed: ${customerLookupError.message}`,
    );
  }

  if (customers?.length) {
    const ids = customers.map(({ id }) => id);
    const { error: orderDeleteError } = await db
      .from('orders')
      .delete()
      .in('customer_id', ids);
    if (orderDeleteError) {
      throw new Error(
        `[e2e reset] order cleanup failed: ${orderDeleteError.message}`,
      );
    }

    const { error: customerDeleteError } = await db
      .from('customers')
      .delete()
      .in('id', ids);
    if (customerDeleteError) {
      throw new Error(
        `[e2e reset] customer cleanup failed: ${customerDeleteError.message}`,
      );
    }
  }

  const { error: inventoryError } = await db.from('kit_inventory').upsert([
    { kit_id: 'ground', available_count: 250 },
    { kit_id: 'ritual', available_count: 250 },
  ], { onConflict: 'kit_id' });
  if (inventoryError) {
    throw new Error(
      `[e2e reset] inventory seed failed: ${inventoryError.message}`,
    );
  }
}
