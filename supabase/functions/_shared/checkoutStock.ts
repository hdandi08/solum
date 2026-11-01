import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

// A read gate only. This does not reserve the last unit or protect an already
// issued PaymentIntent; atomic reservations are a separate rollout.
export async function checkoutStockError(db: SupabaseClient, kitId: string) {
  const unavailable = {
    status: 503,
    body: { error: 'inventory_unavailable', message: 'We could not check stock just now. Please try again shortly.' },
  };
  try {
    const { data, error } = await db.from('kit_inventory')
      .select('available_count').eq('kit_id', kitId).maybeSingle();
    if (error || !data || !Number.isInteger(data.available_count) || data.available_count < 0) {
      console.error('CHECKOUT_STOCK_UNAVAILABLE', { kit_id: kitId });
      return unavailable;
    }
    if (data.available_count === 0) {
      return { status: 409, body: { error: 'sold_out', message: 'This kit is currently sold out.' } };
    }
    return null;
  } catch {
    console.error('CHECKOUT_STOCK_UNAVAILABLE', { kit_id: kitId });
    return unavailable;
  }
}
