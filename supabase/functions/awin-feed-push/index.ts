import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Pushes the SOLUM product feed to Awin's Retail Advertiser Product API.
// Reads live kit_inventory, builds Google-Shopping JSONL, POSTs to Awin (each
// POST replaces the feed; version increments). Triggered daily by pg_cron.
// Guarded by CRON_KEY (?key= or x-cron-key) so it can be public without abuse.
// Secrets: AWIN_API_TOKEN (Bearer), CRON_KEY.

const AWIN_ENDPOINT = 'https://api.awin.com/advertisers/129171/awinfeeds/retail/en_GB/products'
const BRAND = 'SOLUM'
const CURRENCY = 'GBP'

// Keep in sync with supabase/functions/awin-feed (same product data).
const PRODUCTS = [
  {
    id: 'ground', mpn: 'SOLUM-KIT-GROUND', price: '65.00',
    title: "SOLUM GROUND Kit — Complete Men's Body Ritual",
    link: 'https://bysolum.co.uk/buy?kit=ground',
    image_link: 'https://bysolum.co.uk/products/kit/ground.webp',
    description:
      "Properly clean for the first time, head to toe. The GROUND kit fixes what a daily shower misses: a back you can't reach, dead skin that dulls and traps odour, and skin that's dry by midday.\n\n" +
      "Inside the kit:\n01 Body Wash · Gentle everywhere, strips nothing, cleans everything.\n02 Italy Towel Mitt · Smoother skin and less odour from the first use.\n03 Back Scrub Cloth · A back that's finally, properly clean.\n04 Scalp Massager · Thicker-looking hair and no scalp odour.\n05 Atlas Clay Mask · Clearer skin from emptied, deep-cleaned pores.\n07 Body Lotion · Restores and hydrates within the 3-minute window.\n08 Cleansing Cloth · Gentle daily exfoliation, no odour.\n\n" +
      "Sold as a complete kit only, not available individually. One-time purchase, free UK delivery.",
  },
  {
    id: 'ritual', mpn: 'SOLUM-KIT-RITUAL', price: '85.00',
    title: "SOLUM RITUAL Kit — Complete Men's Body Ritual",
    link: 'https://bysolum.co.uk/buy?kit=ritual',
    image_link: 'https://bysolum.co.uk/products/kit/still.webp',
    description:
      "Everything in GROUND, plus the weekly oil ritual most men wish they'd started years ago. Not just clean but fed: smoother skin, less odour, no midday dryness.\n\n" +
      "Inside the kit:\n01 Body Wash · Gentle everywhere, strips nothing, cleans everything.\n02 Italy Towel Mitt · Smoother skin and less odour.\n03 Back Scrub Cloth · A back that's finally clean.\n04 Scalp Massager · Thicker-looking hair, no scalp odour.\n05 Atlas Clay Mask · Clearer skin from deep-cleaned pores.\n06 Argan Body Oil · Skin properly fed, not just moisturised.\n07 Body Lotion · Restores within the 3-minute window.\n08 Cleansing Cloth · Gentle daily exfoliation.\n11 Clay Mixing Bowl · Mixes your weekly mask the right way.\n\n" +
      "Sold as a complete kit only, not available individually. One-time purchase, free UK delivery.",
  },
]

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const key = url.searchParams.get('key') ?? req.headers.get('x-cron-key')
  if (!Deno.env.get('CRON_KEY') || key !== Deno.env.get('CRON_KEY')) {
    return new Response('forbidden', { status: 403 })
  }

  const token = Deno.env.get('AWIN_API_TOKEN')
  if (!token) return new Response('missing AWIN_API_TOKEN', { status: 500 })

  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: inv } = await db.from('kit_inventory').select('kit_id, available_count')
    const counts = new Map<string, number>()
    for (const row of inv ?? []) counts.set(row.kit_id, row.available_count ?? 0)

    const jsonl = PRODUCTS.map((p) => JSON.stringify({
      id: p.id,
      title: p.title,
      description: p.description,
      link: p.link,
      image_link: p.image_link,
      availability: (counts.has(p.id) ? counts.get(p.id)! > 0 : true) ? 'in_stock' : 'out_of_stock',
      price: `${p.price} ${CURRENCY}`,
      brand: BRAND,
      condition: 'new',
      mpn: p.mpn,
    })).join('\n') + '\n'

    const res = await fetch(AWIN_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/jsonlines' },
      body: jsonl,
    })
    const out = await res.text()
    const ok = res.ok && !out.includes('"errors"') && !out.includes('"status":"paused"')
    console.log('awin_push', ok ? 'ok' : 'FAILED', out.slice(0, 200))
    return new Response(out, { status: ok ? 200 : 502, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('awin_push_throw', err.message)
    return new Response(`error: ${err.message}`, { status: 500 })
  }
})
