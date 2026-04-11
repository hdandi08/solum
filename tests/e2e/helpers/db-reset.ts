import { getAdminClient } from './supabase-admin';

export const RITUAL_PRODUCTS = [
  'product-01', 'product-02', 'product-03', 'product-04',
  'product-05', 'product-06', 'product-07', 'product-08',
];

// Full product specs — mirrors supabase/migrations/20260328000002_seed_products_and_kits.sql
// Used by seedRitualStock upsert so tests work even if the DB was wiped between runs.
const RITUAL_PRODUCT_SPECS = [
  { id: 'product-01', name: 'Amino Acid Body Wash 250ml',   sku: 'SOLUM-01', reorder_weeks: 8,  unit_cost_pence: 320, is_consumable: true,  is_active: true },
  { id: 'product-02', name: 'Italy Towel Mitt',              sku: 'SOLUM-02', reorder_weeks: 12, unit_cost_pence: 45,  is_consumable: false, is_active: true },
  { id: 'product-03', name: 'Back Scrub Cloth 70cm',         sku: 'SOLUM-03', reorder_weeks: 12, unit_cost_pence: 80,  is_consumable: false, is_active: true },
  { id: 'product-04', name: 'Silicone Scalp Massager',       sku: 'SOLUM-04', reorder_weeks: 12, unit_cost_pence: 200, is_consumable: false, is_active: true },
  { id: 'product-05', name: 'Atlas Clay Mask 200g',          sku: 'SOLUM-05', reorder_weeks: 8,  unit_cost_pence: 350, is_consumable: true,  is_active: true },
  { id: 'product-06', name: 'Organic Argan Body Oil 50ml',   sku: 'SOLUM-06', reorder_weeks: 8,  unit_cost_pence: 550, is_consumable: true,  is_active: true },
  { id: 'product-07', name: 'Fast-Absorb Body Lotion 400ml', sku: 'SOLUM-07', reorder_weeks: 8,  unit_cost_pence: 440, is_consumable: true,  is_active: true },
  { id: 'product-08', name: 'Bamboo Cloth',                  sku: 'SOLUM-08', reorder_weeks: 12, unit_cost_pence: 0,   is_consumable: false, is_active: true },
];

/** Wipe all transactional records for the test user. Auth user + Stripe customer are preserved. */
export async function resetTestUserData() {
  const db = getAdminClient();
  const email = process.env.TEST_USER_EMAIL!;

  const { data: customer } = await db
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (customer) {
    await db.from('subscriptions').delete().eq('customer_id', customer.id);
    await db.from('addresses').delete().eq('customer_id', customer.id);
    await db.from('customers').delete().eq('id', customer.id);
  }

  await db.from('leads').delete().eq('email', email);
}

/**
 * Upsert all ritual kit products with the given stock quantity.
 * Uses upsert (not update) so it creates rows if they don't exist —
 * safe to call even on a freshly wiped dev DB.
 */
export async function seedRitualStock(qty = 10) {
  const db = getAdminClient();
  const rows = RITUAL_PRODUCT_SPECS.map(p => ({ ...p, current_stock: qty }));
  await db
    .from('products')
    .upsert(rows, { onConflict: 'id' });
}

/** Zero out all ritual products — simulates a completely unstocked DB. */
export async function zeroAllRitualStock() {
  const db = getAdminClient();
  await db
    .from('products')
    .update({ current_stock: 0 })
    .in('id', RITUAL_PRODUCTS);
}

/** Zero out one ritual product (product-06 Argan Oil) — unique to ritual/sovereign only. */
export async function sellOutRitualKit() {
  const db = getAdminClient();
  await db
    .from('products')
    .update({ current_stock: 0 })
    .eq('id', 'product-06');
}
