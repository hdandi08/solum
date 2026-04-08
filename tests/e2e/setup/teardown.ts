import { test as teardown } from '@playwright/test';
import { getAdminClient } from '../helpers/supabase-admin';
import { RITUAL_PRODUCTS } from '../helpers/db-reset';

teardown('global teardown — zero out seeded inventory', async () => {
  const db = getAdminClient();
  await db
    .from('products')
    .update({ current_stock: 0 })
    .in('id', RITUAL_PRODUCTS);
});
