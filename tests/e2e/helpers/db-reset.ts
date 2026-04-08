import { getAdminClient } from './supabase-admin';

export const RITUAL_PRODUCTS = [
  'product-01', 'product-02', 'product-03', 'product-04',
  'product-05', 'product-06', 'product-07', 'product-08',
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

/** Set all ritual kit products to sufficient stock for checkout tests. */
export async function seedRitualStock(qty = 10) {
  const db = getAdminClient();
  await db
    .from('products')
    .update({ current_stock: qty })
    .in('id', RITUAL_PRODUCTS);
}

/** Zero out one ritual product to trigger the sold-out / waitlist path. */
export async function sellOutRitualKit() {
  const db = getAdminClient();
  await db
    .from('products')
    .update({ current_stock: 0 })
    .eq('id', 'product-06'); // Argan Oil — unique to ritual/sovereign
}
