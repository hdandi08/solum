import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Awin product data feed (advertiser 129171). Awin fetches this URL daily.
// in_stock is live from kit_inventory; everything else is stable product data.
// Deploy PUBLIC (--no-verify-jwt) so Awin can fetch it unauthenticated.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BRAND = 'SOLUM'
const CATEGORY = 'Health & Beauty > Personal Care > Cosmetics > Skin Care'
const CURRENCY = 'GBP'
const DELIVERY = '0.00' // free UK delivery

const PRODUCTS = [
  {
    product_id: 'ground',
    product_name: "SOLUM GROUND Kit — Complete Men's Body Ritual",
    merchant_image_url: 'https://bysolum.co.uk/products/kit/ground.webp',
    merchant_deep_link: 'https://bysolum.co.uk/buy?kit=ground',
    search_price: '65.00',
    description:
      "Properly clean for the first time, head to toe. The GROUND kit fixes what a daily shower misses: a back you can't reach, dead skin that dulls and traps odour, and skin that's dry by midday.\n\n" +
      "Inside the kit:\n" +
      "01 Body Wash · Gentle everywhere, strips nothing, cleans everything.\n" +
      "02 Italy Towel Mitt · Smoother skin and less odour from the first use.\n" +
      "03 Back Scrub Cloth · A back that's finally, properly clean.\n" +
      "04 Scalp Massager · Thicker-looking hair and no scalp odour.\n" +
      "05 Atlas Clay Mask · Clearer skin from emptied, deep-cleaned pores.\n" +
      "07 Body Lotion · Restores and hydrates within the 3-minute window.\n" +
      "08 Cleansing Cloth · Gentle daily exfoliation, no odour.\n\n" +
      "Sold as a complete kit only, not available individually. One-time purchase, free UK delivery.",
  },
  {
    product_id: 'ritual',
    product_name: "SOLUM RITUAL Kit — Complete Men's Body Ritual",
    merchant_image_url: 'https://bysolum.co.uk/products/kit/still.webp',
    merchant_deep_link: 'https://bysolum.co.uk/buy?kit=ritual',
    search_price: '85.00',
    description:
      "Everything in GROUND, plus the weekly oil ritual most men wish they'd started years ago. Not just clean but fed: smoother skin, less odour, no midday dryness.\n\n" +
      "Inside the kit:\n" +
      "01 Body Wash · Gentle everywhere, strips nothing, cleans everything.\n" +
      "02 Italy Towel Mitt · Smoother skin and less odour from the first use.\n" +
      "03 Back Scrub Cloth · A back that's finally, properly clean.\n" +
      "04 Scalp Massager · Thicker-looking hair and no scalp odour.\n" +
      "05 Atlas Clay Mask · Clearer skin from emptied, deep-cleaned pores.\n" +
      "06 Argan Body Oil · Skin properly fed, not just moisturised.\n" +
      "07 Body Lotion · Restores and hydrates within the 3-minute window.\n" +
      "08 Cleansing Cloth · Gentle daily exfoliation, no odour.\n" +
      "11 Clay Mixing Bowl · Mixes your weekly mask the right way.\n\n" +
      "Sold as a complete kit only, not available individually. One-time purchase, free UK delivery.",
  },
]

const COLUMNS = [
  'product_id', 'product_name', 'description', 'merchant_image_url',
  'search_price', 'currency', 'merchant_deep_link', 'in_stock',
  'brand_name', 'merchant_category', 'delivery_cost',
]

function csvField(v: string): string {
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: inv, error } = await db
      .from('kit_inventory')
      .select('kit_id, available_count')
    if (error) throw error

    // kit_id -> available_count; kits absent from the table default to in stock.
    const counts = new Map<string, number>()
    for (const row of inv ?? []) counts.set(row.kit_id, row.available_count ?? 0)

    const rows = PRODUCTS.map((p) => {
      const inStock = counts.has(p.product_id) ? (counts.get(p.product_id)! > 0 ? '1' : '0') : '1'
      return [
        p.product_id, p.product_name, p.description, p.merchant_image_url,
        p.search_price, CURRENCY, p.merchant_deep_link, inStock,
        BRAND, CATEGORY, DELIVERY,
      ].map(csvField).join(',')
    })

    const csv = [COLUMNS.join(','), ...rows].join('\n') + '\n'

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'inline; filename="solum_awin_feed.csv"',
        'Cache-Control': 'public, max-age=1800',
      },
    })
  } catch (err) {
    return new Response(`error: ${err.message}`, {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    })
  }
})
