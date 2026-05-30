# One-Off Purchase Channel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a permanent `/buy` one-time checkout page (first batch, gift, TikTok), update the homepage to first-batch mode, and wire up the backend so one-time orders flow into Supabase without creating subscriptions.

**Architecture:** New `create-first-box-session` edge function handles one-time Stripe payments. Stripe webhook detects `source` in session metadata and branches to a one-time order path (skipping subscription creation). `BuyPage.jsx` is a context-aware checkout page driven by `?kit=` and `?source=` URL params. Homepage Phase 1 mode is controlled by a `VITE_SITE_MODE=first_batch` env var.

**Tech Stack:** Deno edge functions (Supabase), React + React Router, Stripe Checkout, Resend, Supabase Postgres

**DEV project:** `rodvvmfzkyjsqbufkjbc` · **PROD project:** `gvfptmjluxpngfjendbi`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/20260530000001_orders_source.sql` | Create | Add `source` column to `orders` table |
| `supabase/functions/get-inventory-status/index.ts` | Modify | Return `available_count` per kit, not just boolean |
| `supabase/functions/create-first-box-session/index.ts` | Create | One-time Stripe Checkout session (no subscription setup) |
| `supabase/functions/stripe-webhook/index.ts` | Modify | Branch on `source` metadata — one-time order path skips subscription |
| `web/src/pages/BuyPage.jsx` | Create | Universal one-time checkout: first-batch / gift / TikTok contexts |
| `web/src/App.jsx` | Modify | Add `/buy` route |
| `web/src/pages/FullSite.jsx` | Modify | Hide `SubscriptionSection` when `VITE_SITE_MODE=first_batch` |
| `web/src/components/KitComparison.jsx` | Modify | Navigate to `/buy?kit=...` in first-batch mode; hide subscription sub-line |
| `web/src/components/Hero.jsx` | Modify | Update eyebrow copy in first-batch mode |
| `web/src/components/CTASection.jsx` | Modify | Update body copy in first-batch mode |

---

## Task 1: DB Migration — add `source` to `orders`

**Files:**
- Create: `supabase/migrations/20260530000001_orders_source.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260530000001_orders_source.sql
alter table orders
  add column if not exists source text
    check (source in ('first_batch', 'gift', 'tiktok_shop', 'website'))
    default null;

comment on column orders.source is
  'Acquisition channel for this order. NULL = subscription flow (legacy). first_batch = Phase 1 launch. gift = gift purchase. tiktok_shop = TikTok sale.';
```

- [ ] **Step 2: Apply to DEV**

```bash
supabase db push --project-ref rodvvmfzkyjsqbufkjbc
```

Expected: `Applied 1 migration(s)` with no errors.

- [ ] **Step 3: Verify in DEV**

```bash
supabase db execute --project-ref rodvvmfzkyjsqbufkjbc \
  "select column_name, data_type, column_default from information_schema.columns where table_name='orders' and column_name='source';"
```

Expected: one row, `column_name=source`, `data_type=text`, `column_default=null`.

- [ ] **Step 4: Apply to PROD**

```bash
supabase db push --project-ref gvfptmjluxpngfjendbi
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260530000001_orders_source.sql
git commit -m "feat: add source column to orders table"
```

---

## Task 2: Enhance `get-inventory-status` — return counts

**Files:**
- Modify: `supabase/functions/get-inventory-status/index.ts`

Currently returns `{ kits: { ground: true, ritual: true } }`. Change to return `{ kits: { ground: { available: true, count: 187 }, ritual: { available: true, count: 63 } } }`.

- [ ] **Step 1: Update the function**

Replace the entire file contents with:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: kitInventory, error } = await db
      .from('kit_inventory')
      .select('kit_id, available_count')

    if (error) throw error

    const kits: Record<string, { available: boolean; count: number }> = {}
    for (const row of kitInventory ?? []) {
      kits[row.kit_id] = {
        available: row.available_count > 0,
        count: row.available_count ?? 0,
      }
    }

    return new Response(JSON.stringify({ kits }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Step 2: Deploy to DEV**

```bash
supabase functions deploy get-inventory-status --project-ref rodvvmfzkyjsqbufkjbc --no-verify-jwt
```

- [ ] **Step 3: Smoke test**

```bash
curl "https://rodvvmfzkyjsqbufkjbc.supabase.co/functions/v1/get-inventory-status"
```

Expected: `{"kits":{"ground":{"available":true,"count":250},"ritual":{"available":true,"count":250}}}` (or whatever counts are in kit_inventory).

- [ ] **Step 4: Deploy to PROD**

```bash
supabase functions deploy get-inventory-status --project-ref gvfptmjluxpngfjendbi --no-verify-jwt
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/get-inventory-status/index.ts
git commit -m "feat: get-inventory-status returns count not just boolean"
```

---

## Task 3: Create `create-first-box-session` edge function

**Files:**
- Create: `supabase/functions/create-first-box-session/index.ts`

One-time Stripe Checkout session. No recurring setup, no billing anchor, no trial. Source is passed through to Stripe metadata and written to the `leads` table.

Pricing: first_batch uses standard kit prices (£65/£85). Gift and TikTok add a £10 premium (£75/£95).

- [ ] **Step 1: Create the function directory**

```bash
mkdir -p supabase/functions/create-first-box-session
```

- [ ] **Step 2: Write the function**

Create `supabase/functions/create-first-box-session/index.ts`:

```typescript
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Standard first-box prices (pence). Gift and TikTok add £10 premium.
const KIT_BASE_PENCE: Record<string, number> = {
  ground: 6500,
  ritual: 8500,
};

const KIT_NAMES: Record<string, string> = {
  ground: 'GROUND',
  ritual: 'RITUAL',
};

// Sources that carry a £10 premium over standard pricing
const PREMIUM_SOURCES = ['gift', 'tiktok_shop'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let kit_id: string | undefined;
  let email: string | undefined;

  try {
    const body = await req.json();
    kit_id = body.kit_id;
    email = body.email?.trim().toLowerCase();
    const { first_name, last_name, source, success_url, cancel_url } = body;

    if (!KIT_BASE_PENCE[kit_id!]) {
      return new Response(JSON.stringify({ error: 'Invalid kit_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isPremium = PREMIUM_SOURCES.includes(source ?? '');
    const amountPence = KIT_BASE_PENCE[kit_id!] + (isPremium ? 1000 : 0);
    const kitName = KIT_NAMES[kit_id!];
    const effectiveSource = source ?? 'first_batch';

    // Create or retrieve Stripe customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data.length > 0
      ? existing.data[0]
      : await stripe.customers.create({
          email,
          name: [first_name, last_name].filter(Boolean).join(' ') || undefined,
        });

    const price = await stripe.prices.create({
      currency: 'gbp',
      unit_amount: amountPence,
      product_data: { name: `SOLUM ${kitName} Kit` },
    });

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'payment',
      line_items: [{ price: price.id, quantity: 1 }],
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ['GB'] },
      success_url,
      cancel_url,
      metadata: {
        kit_id,
        first_name,
        last_name: last_name ?? '',
        source: effectiveSource,
      },
    });

    // Capture lead
    await supabase.from('leads').upsert({
      email,
      first_name,
      last_name: last_name ?? null,
      kit_id,
      stripe_session_id: session.id,
      stripe_customer_id: customer.id,
      checkout_status: 'initiated',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'stripe_session_id' });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('SOLUM_FIRST_BOX_ERROR', JSON.stringify({ message: err.message, kit_id, email }));
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again or contact contact@bysolum.co.uk.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
```

- [ ] **Step 3: Deploy to DEV**

```bash
supabase functions deploy create-first-box-session --project-ref rodvvmfzkyjsqbufkjbc --no-verify-jwt
```

- [ ] **Step 4: Smoke test (replace with a real test email)**

```bash
curl -X POST "https://rodvvmfzkyjsqbufkjbc.supabase.co/functions/v1/create-first-box-session" \
  -H "Content-Type: application/json" \
  -d '{
    "kit_id": "ground",
    "email": "test@example.com",
    "first_name": "Test",
    "source": "first_batch",
    "success_url": "http://localhost:5173/success",
    "cancel_url": "http://localhost:5173/buy"
  }'
```

Expected: `{"url":"https://checkout.stripe.com/c/pay/..."}` — a valid Stripe Checkout URL.

- [ ] **Step 5: Verify lead captured in DEV Supabase**

Check `leads` table in Supabase dashboard for a row with `checkout_status=initiated` and the test email.

- [ ] **Step 6: Deploy to PROD**

```bash
supabase functions deploy create-first-box-session --project-ref gvfptmjluxpngfjendbi --no-verify-jwt
```

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/create-first-box-session/
git commit -m "feat: create-first-box-session edge function — one-time Stripe checkout"
```

---

## Task 4: Update `stripe-webhook` — handle one-time orders

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts`

The webhook's `checkout.session.completed` handler currently always tries to create a Stripe subscription. We need it to detect `source` in metadata and branch: if source is present, write a one-time order row (with `source` set, `subscription_id` null) and skip all subscription creation.

- [ ] **Step 1: Find the `checkout.session.completed` case**

Open `supabase/functions/stripe-webhook/index.ts`. Find this block (around line 185):

```typescript
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session;
  const { kit_id, first_name, last_name, birth_year, birth_month, first_charge_ts, monthly_pence } = session.metadata ?? {};
```

- [ ] **Step 2: Add one-time order handler function**

Add this function to the file, just above the `Deno.serve(...)` call (around line 171):

```typescript
async function handleOneTimeOrder(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createClient>,
) {
  const { kit_id, first_name, last_name, source } = session.metadata ?? {};
  const email = (session.customer_details?.email ?? session.customer_email)?.trim().toLowerCase();
  const phone = session.customer_details?.phone ?? null;
  const stripe_customer_id = session.customer as string;

  // Upsert customer (no subscription fields)
  const { data: customer, error: customerErr } = await supabase
    .from('customers')
    .upsert({
      email,
      first_name,
      last_name: last_name || null,
      stripe_customer_id,
      kit_id,
    }, { onConflict: 'email' })
    .select()
    .single();

  if (!customer) throw new Error(`one_time_customer_upsert_failed: ${customerErr?.message}`);

  // Insert order with source, no subscription_id
  const { data: order } = await supabase.from('orders').insert({
    customer_id: customer.id,
    subscription_id: null,
    stripe_payment_id: session.payment_intent as string,
    kit_id,
    order_type: 'first_box',
    box_number: null,
    amount_pence: session.amount_total ?? 0,
    status: 'paid',
    source,
  }).select('id').single();

  // Deduct inventory
  if (kit_id && order?.id) {
    await deductInventory(supabase, kit_id, 'first_box', order.id);
  }

  // Mark lead completed
  await supabase.from('leads')
    .update({ checkout_status: 'completed', updated_at: new Date().toISOString() })
    .eq('stripe_session_id', session.id);

  // Send confirmation email
  if (email && order) {
    const orderRef = session.id.slice(-8).toUpperCase();
    await sendConfirmationEmail(email, first_name ?? 'there', kit_id ?? '', orderRef);
  }

  // Store shipping address
  const sd = (session as any).collected_information?.shipping_details ?? session.shipping_details;
  if (sd?.address && customer) {
    await supabase.from('addresses').upsert({
      customer_id: customer.id,
      stripe_session_id: session.id,
      name: sd.name ?? '',
      line1: sd.address.line1 ?? '',
      line2: sd.address.line2 ?? null,
      city: sd.address.city ?? '',
      postcode: sd.address.postal_code ?? '',
      country: sd.address.country ?? 'GB',
      phone,
      is_current: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'stripe_session_id' });
  }
}
```

- [ ] **Step 3: Branch at the top of `checkout.session.completed`**

Find the start of the case (around line 185). After the destructuring line, add the branch before the existing subscription logic:

```typescript
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session;
  const { kit_id, first_name, last_name, birth_year, birth_month, first_charge_ts, monthly_pence } = session.metadata ?? {};
  const email = (session.customer_details?.email ?? session.customer_email)?.trim().toLowerCase();
  const phone = session.customer_details?.phone ?? null;
  const stripe_customer_id = session.customer as string;

  // One-time purchase: source present in metadata → skip subscription creation
  if (session.metadata?.source) {
    await handleOneTimeOrder(session, supabase);
    break;
  }

  // ── Existing subscription flow continues below unchanged ──
  let stripe_subscription_id = session.subscription as string | null;
  // ... rest of existing code unchanged ...
```

- [ ] **Step 4: Deploy to DEV**

```bash
supabase functions deploy stripe-webhook --project-ref rodvvmfzkyjsqbufkjbc --no-verify-jwt
```

- [ ] **Step 5: Test one-time flow end-to-end in Stripe test mode**

Go to the DEV site on localhost. Complete a purchase through `/buy` (Task 5 must be done first). In Stripe dashboard (test mode), confirm:
- `checkout.session.completed` fired
- No subscription created
- Order row in Supabase `orders` table has `source=first_batch` and `subscription_id=null`
- Customer row upserted in `customers` table
- Lead marked `completed` in `leads` table

- [ ] **Step 6: Deploy to PROD**

```bash
supabase functions deploy stripe-webhook --project-ref gvfptmjluxpngfjendbi --no-verify-jwt
```

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts
git commit -m "feat: stripe-webhook handles one-time orders — branches on source metadata"
```

---

## Task 5: Build `BuyPage.jsx`

**Files:**
- Create: `web/src/pages/BuyPage.jsx`

Context-aware one-time checkout page. Reads `?kit=ground|ritual` and `?source=gift|tiktok` from URL. Fetches stock from `get-inventory-status` (shown only for first-batch context). Calls `create-first-box-session` and redirects to Stripe.

- [ ] **Step 1: Check the Supabase URL env vars**

```bash
grep -r "VITE_SUPABASE" /Users/harshamahadeva/NewCo/solum/web/src/ | head -5
```

Note the pattern used for calling edge functions (e.g. `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/...`).

- [ ] **Step 2: Create `BuyPage.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const KIT_CONFIG = {
  ground: {
    name: 'GROUND',
    tagline: 'Properly clean for the first time. Dead skin gone. Your back actually clean.',
    firstBatchPrice: 65,
    premiumPrice: 75,
  },
  ritual: {
    name: 'RITUAL',
    tagline: 'Everything in GROUND plus the oil ritual. Skin that stays fed all day.',
    firstBatchPrice: 85,
    premiumPrice: 95,
    popular: true,
  },
};

const PREMIUM_SOURCES = ['gift', 'tiktok'];

const CSS = `
.buy-page{min-height:100vh;background:var(--black,#08090B);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:80px 24px 60px;color:var(--bone,#F0ECE2);}
.buy-logo{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.15em;color:var(--bone,#F0ECE2);margin-bottom:48px;text-decoration:none;display:block;text-align:center;}
.buy-heading{font-family:'Bebas Neue',sans-serif;font-size:clamp(32px,5vw,56px);letter-spacing:.06em;text-align:center;line-height:1;margin-bottom:8px;}
.buy-subhead{font-size:15px;font-weight:300;color:#8b93a0;text-align:center;margin-bottom:48px;letter-spacing:.5px;}
.buy-stock{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(46,109,164,0.4);padding:8px 16px;margin-bottom:40px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#4A8FC7;}
.buy-stock-dot{width:6px;height:6px;border-radius:50%;background:#4A8FC7;animation:pulse 2s ease infinite;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
.buy-kits{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(255,255,255,0.06);max-width:720px;width:100%;margin-bottom:40px;}
@media(max-width:560px){.buy-kits{grid-template-columns:1fr;}}
.buy-kit{background:#0e1117;padding:32px 28px;cursor:pointer;position:relative;transition:background .15s;}
.buy-kit:hover{background:#131820;}
.buy-kit.selected{background:#0e1821;outline:2px solid #2E6DA4;}
.buy-kit.soldout{opacity:.5;cursor:default;}
.buy-kit-badge{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#4A8FC7;font-weight:700;margin-bottom:12px;display:block;}
.buy-kit-name{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.06em;line-height:1;margin-bottom:8px;}
.buy-kit-tagline{font-size:13px;font-weight:300;color:#8b93a0;line-height:1.5;margin-bottom:20px;}
.buy-kit-price{font-family:'Bebas Neue',sans-serif;font-size:44px;letter-spacing:-1px;line-height:1;}
.buy-kit-price-label{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#8b93a0;margin-top:4px;}
.buy-kit-soldout{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#555;margin-top:8px;}
.buy-form{max-width:420px;width:100%;display:flex;flex-direction:column;gap:14px;}
.buy-form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.buy-field{display:flex;flex-direction:column;gap:6px;}
.buy-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8b93a0;font-weight:600;}
.buy-input{background:#0e1117;border:1px solid rgba(255,255,255,0.1);color:var(--bone,#F0ECE2);padding:13px 16px;font-size:15px;font-weight:300;outline:none;transition:border-color .15s;width:100%;box-sizing:border-box;}
.buy-input:focus{border-color:#2E6DA4;}
.buy-input::placeholder{color:#555;}
.buy-submit{font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:.12em;background:var(--bone,#F0ECE2);color:#08090B;padding:18px 40px;border:none;cursor:pointer;width:100%;margin-top:8px;transition:background .15s,transform .12s;}
.buy-submit:hover:not(:disabled){background:#fff;transform:translateY(-1px);}
.buy-submit:disabled{opacity:.5;cursor:default;}
.buy-error{font-size:13px;color:#e05555;text-align:center;margin-top:4px;}
.buy-secure{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#444;text-align:center;margin-top:16px;}
.buy-waitlist{max-width:420px;width:100%;text-align:center;}
.buy-waitlist h2{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.06em;margin-bottom:12px;}
.buy-waitlist p{font-size:15px;font-weight:300;color:#8b93a0;line-height:1.6;margin-bottom:28px;}
`;

export default function BuyPage() {
  const [params] = useSearchParams();
  const source = params.get('source') ?? 'first_batch';
  const preselect = params.get('kit');

  const isPremium = PREMIUM_SOURCES.includes(source);
  const isFirstBatch = !isPremium;

  const [inventory, setInventory] = useState(null); // { ground: {available,count}, ritual: {available,count} }
  const [selectedKit, setSelectedKit] = useState(preselect ?? 'ritual');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${SUPABASE_URL}/functions/v1/get-inventory-status`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    })
      .then(r => r.json())
      .then(d => setInventory(d.kits ?? {}))
      .catch(() => setInventory({}));
  }, []);

  const bothSoldOut = inventory &&
    !inventory.ground?.available &&
    !inventory.ritual?.available;

  const selectedPrice = selectedKit
    ? (isPremium
        ? KIT_CONFIG[selectedKit].premiumPrice
        : KIT_CONFIG[selectedKit].firstBatchPrice)
    : null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedKit || loading) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-first-box-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({
          kit_id: selectedKit,
          email: form.email,
          first_name: form.firstName,
          last_name: form.lastName,
          source,
          success_url: `${window.location.origin}/success?kit=${selectedKit}`,
          cancel_url: window.location.href,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const totalGroundCount = (inventory?.ground?.count ?? 0) + (inventory?.ritual?.count ?? 0);

  return (
    <>
      <style>{CSS}</style>
      <div className="buy-page">
        <a href="/" className="buy-logo">SOLUM</a>

        {bothSoldOut ? (
          <div className="buy-waitlist">
            <h2>Sold Out.</h2>
            <p>All 250 first-batch kits have been claimed. Leave your email and you'll be first to know when we restock.</p>
            {/* Waitlist email capture — simple mailto for now */}
            <a href="mailto:contact@bysolum.co.uk?subject=Restock%20Waitlist" className="buy-submit" style={{display:'block',textAlign:'center',textDecoration:'none',fontFamily:"'Bebas Neue',sans-serif",fontSize:'17px',letterSpacing:'.12em',background:'#F0ECE2',color:'#08090B',padding:'18px 40px'}}>
              JOIN WAITLIST
            </a>
          </div>
        ) : (
          <>
            <h1 className="buy-heading">
              {isFirstBatch ? '250 Kits. No Subscription.' : 'Get Your Kit.'}
            </h1>
            <p className="buy-subhead">
              {isFirstBatch
                ? 'One-time purchase. No commitment. Start the ritual.'
                : 'One-time purchase. Subscribe anytime after.'}
            </p>

            {isFirstBatch && inventory && (
              <div className="buy-stock">
                <span className="buy-stock-dot" />
                {totalGroundCount} of 250 remaining
              </div>
            )}

            <div className="buy-kits">
              {Object.entries(KIT_CONFIG).map(([id, kit]) => {
                const stock = inventory?.[id];
                const available = !inventory || stock?.available;
                const price = isPremium ? kit.premiumPrice : kit.firstBatchPrice;
                return (
                  <div
                    key={id}
                    className={`buy-kit${selectedKit === id ? ' selected' : ''}${!available ? ' soldout' : ''}`}
                    onClick={() => available && setSelectedKit(id)}
                  >
                    {kit.popular && <span className="buy-kit-badge">Most Popular</span>}
                    <div className="buy-kit-name">{kit.name}</div>
                    <div className="buy-kit-tagline">{kit.tagline}</div>
                    <div className="buy-kit-price">£{price}</div>
                    <div className="buy-kit-price-label">one-time</div>
                    {!available && <div className="buy-kit-soldout">Sold Out</div>}
                  </div>
                );
              })}
            </div>

            <form className="buy-form" onSubmit={handleSubmit}>
              <div className="buy-form-row">
                <div className="buy-field">
                  <label className="buy-label">First Name</label>
                  <input
                    className="buy-input"
                    type="text"
                    required
                    placeholder="James"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  />
                </div>
                <div className="buy-field">
                  <label className="buy-label">Last Name</label>
                  <input
                    className="buy-input"
                    type="text"
                    placeholder="Smith"
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="buy-field">
                <label className="buy-label">Email</label>
                <input
                  className="buy-input"
                  type="email"
                  required
                  placeholder="james@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>

              {error && <div className="buy-error">{error}</div>}

              <button
                className="buy-submit"
                type="submit"
                disabled={loading || !selectedKit}
              >
                {loading ? 'Redirecting...' : `Get ${selectedKit ? KIT_CONFIG[selectedKit].name : 'Kit'} — £${selectedPrice}`}
              </button>
              <div className="buy-secure">Secure checkout · Powered by Stripe</div>
            </form>
          </>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/BuyPage.jsx
git commit -m "feat: BuyPage — universal one-time checkout (first-batch, gift, TikTok)"
```

---

## Task 6: Wire up routing + Homepage Phase 1 mode

**Files:**
- Modify: `web/src/App.jsx`
- Modify: `web/src/pages/FullSite.jsx`
- Modify: `web/src/components/KitComparison.jsx`
- Modify: `web/src/components/Hero.jsx`
- Modify: `web/src/components/CTASection.jsx`

### 6a — Add `/buy` route

- [ ] **Step 1: Add import and route to `App.jsx`**

In `web/src/App.jsx`, add after the existing imports:

```jsx
import BuyPage from './pages/BuyPage';
```

In the `<Routes>` block, add after the `/checkout` route:

```jsx
<Route path="/buy" element={<BuyPage />} />
```

- [ ] **Step 2: Commit**

```bash
git add web/src/App.jsx
git commit -m "feat: add /buy route"
```

### 6b — VITE_SITE_MODE env var + hide SubscriptionSection

The env var `VITE_SITE_MODE=first_batch` controls Phase 1 mode. When absent or any other value, site renders in normal mode.

- [ ] **Step 3: Update `FullSite.jsx`**

Add at the top of the file, after existing imports:

```jsx
const IS_FIRST_BATCH = import.meta.env.VITE_SITE_MODE === 'first_batch';
```

In the JSX return, wrap `SubscriptionSection` and `LoyaltySection`:

```jsx
{!IS_FIRST_BATCH && <SubscriptionSection />}
{!IS_FIRST_BATCH && <LoyaltySection />}
```

(Replace the existing bare `<SubscriptionSection />` and `<LoyaltySection />` lines.)

- [ ] **Step 4: Update `KitComparison.jsx`**

Add at the top of the file:

```jsx
const IS_FIRST_BATCH = import.meta.env.VITE_SITE_MODE === 'first_batch';
```

Change the kit CTA `onClick` to navigate to `/buy` in first-batch mode:

```jsx
<button
  className="kit-cta active"
  onClick={() => navigate(IS_FIRST_BATCH ? `/buy?kit=${kit.id}` : `/checkout?kit=${kit.id}`)}
>
  {IS_FIRST_BATCH ? `Get ${kit.name}` : `Start with ${kit.name}`}
</button>
```

Change the subscription sub-line under the price to hide in first-batch mode:

```jsx
{!IS_FIRST_BATCH && (
  <div className="kit-price-sub">
    then <span>£{kit.monthlyPrice}/mo</span>
    {kit.comingSoon ? ' when available' : ' · cancel any time'}
  </div>
)}
```

Change the kits footnote at the bottom:

```jsx
<p className="kits-footnote">
  {IS_FIRST_BATCH
    ? 'One-time purchase. No subscription required. Subscription launches later — current buyers get first access.'
    : 'First box is a one-time purchase and lasts 4–6 weeks. Monthly refills ship on the 1st — so you never run out. Cancel any time.'}
</p>
```

- [ ] **Step 5: Update `Hero.jsx`**

Add at the top of the file:

```jsx
const IS_FIRST_BATCH = import.meta.env.VITE_SITE_MODE === 'first_batch';
```

Change the eyebrow line:

```jsx
<div className="hero-eyebrow">
  {IS_FIRST_BATCH ? '250 kits · no subscription required' : 'Men shower. Men don\'t actually clean.'}
</div>
```

Change the scope note:

```jsx
<span className="hero-scope-note">
  {IS_FIRST_BATCH ? 'One-time · No commitment' : 'Your Body — Head to Toe.'}
</span>
```

- [ ] **Step 6: Update `CTASection.jsx`**

Add at the top of the file:

```jsx
const IS_FIRST_BATCH = import.meta.env.VITE_SITE_MODE === 'first_batch';
```

Change the offer line:

```jsx
<div className="cta-offer">
  {IS_FIRST_BATCH
    ? '250 kits only · one-time purchase · GROUND £65 · RITUAL £85'
    : 'Spaces are filling fast · GROUND from £65 · RITUAL from £85'}
</div>
```

Change the CTA button href:

```jsx
<a
  href={IS_FIRST_BATCH ? '/buy' : '#kits'}
  className="cta-btn-primary"
  onClick={() => trackGoal('bottom_cta_clicked', { variant: ctaVariant })}
>
  {IS_FIRST_BATCH ? 'Get Your Kit' : ctaLabel}
</a>
```

- [ ] **Step 7: Commit**

```bash
git add web/src/pages/FullSite.jsx web/src/components/KitComparison.jsx web/src/components/Hero.jsx web/src/components/CTASection.jsx
git commit -m "feat: homepage phase-1 mode — first-batch copy, hide subscription section, /buy CTAs"
```

---

## Task 7: Set env var + test locally

- [ ] **Step 1: Create/update `.env.local` for dev testing**

In `web/.env.local` (create if it doesn't exist), add:

```
VITE_SITE_MODE=first_batch
```

- [ ] **Step 2: Start dev server**

```bash
cd /Users/harshamahadeva/NewCo/solum/web && npm run dev
```

- [ ] **Step 3: Verify homepage in first-batch mode**

Open `http://localhost:5173`. Confirm:
- Hero eyebrow shows "250 kits · no subscription required"
- Kit cards show £65 / £85 with no "then £38/mo" line
- Kit CTA buttons say "Get GROUND" / "Get RITUAL"
- Kit footnote shows one-time copy
- Subscription section is absent from the page

- [ ] **Step 4: Verify `/buy` page**

Open `http://localhost:5173/buy`. Confirm:
- Both kit cards visible with correct prices (£65 / £85)
- Stock counter shows (if kit_inventory has rows)
- Gift context: open `http://localhost:5173/buy?source=gift` — prices should show £75 / £95
- Form submits and redirects to Stripe Checkout (use a Stripe test card)

- [ ] **Step 5: Complete a test purchase end-to-end**

Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC. Confirm:
- Redirects to `/success` after payment
- `orders` table in DEV Supabase has a row with `source=first_batch`, `subscription_id=null`
- `customers` table has the test customer
- `leads` table has `checkout_status=completed`
- No subscription created in Stripe dashboard

- [ ] **Step 6: Set `VITE_SITE_MODE=first_batch` in Amplify (DEV branch)**

In AWS Amplify console → App: Solum → Branch: dev → Environment variables:
Add `VITE_SITE_MODE` = `first_batch`

Redeploy the dev branch. Confirm the live dev URL shows first-batch mode.

---

## Task 8: Deploy PROD

When DEV is confirmed working:

- [ ] **Step 1: Merge dev to master (with sign-off)**

Get explicit sign-off from Harsha before merging. Then:

```bash
git checkout master && git merge dev && git push
```

- [ ] **Step 2: Set `VITE_SITE_MODE=first_batch` in Amplify (master branch)**

In AWS Amplify console → App: Solum → Branch: master → Environment variables:
Add `VITE_SITE_MODE` = `first_batch`

Amplify will auto-redeploy.

- [ ] **Step 3: Switch Supabase to live keys (if not already done)**

From `project_checkout_status.md` pre-launch checklist:
- Swap `STRIPE_SECRET_KEY` in Supabase PROD to `sk_live_...`
- Swap `VITE_STRIPE_PUBLISHABLE_KEY` in Amplify master to `pk_live_...`
- Register webhook in Stripe live mode

- [ ] **Step 4: Do one live test order**

Place a real £65 order on `bysolum.co.uk/buy`. Confirm:
- Payment succeeds
- Order in PROD Supabase with `source=first_batch`
- Confirmation email arrives
- No subscription in Stripe live dashboard

---

## Task 9: New Projections Artefact (independent — can do separately)

**Files:**
- Create: `artefacts/solum-5year-projections-v2.html`

This task is standalone — no code dependencies. Can be done in a separate session.

The new projections must model:
- **Months 1–2:** One-time revenue only. Assume ~200 GROUND (£65) + ~50 RITUAL (£85) sold = £17,250 total. No recurring.
- **Month 3 onwards:** Subscription launches. Apply conversion rate to first-batch buyers: conservative 30%, base 45%, optimistic 60%.
- **Year 1–5:** Standard subscription model from converted base + new paid acquisition. Churn: 7–7.5%/month (same as before).

Build as a styled HTML artefact matching the existing artefact aesthetic (dark, Bebas Neue, Steel Blue accents). Include:
- Phase 1 revenue summary (one-time)
- Conversion rate sensitivity table (30% / 45% / 60%)
- Year 1–5 projection table (conservative / base / optimistic)
- Key milestones

Save to `artefacts/solum-5year-projections-v2.html` and commit.

---

## Task 10: E2E Tests — `/buy` One-Time Purchase Flow

**Files:**
- Delete: `web/e2e/` (all existing tests — written for old subscription flow)
- Create: `web/e2e/buy-flow.spec.ts`
- Modify: `web/playwright.config.ts` (update baseURL and test dir if needed)

**Context:** The existing Playwright e2e tests were written for the subscription checkout flow and are now stale. We're replacing them with tests that cover the `/buy` one-time purchase path end to end.

**Test environment:** Dev Supabase (`rodvvmfzkyjsqbufkjbc`) with test Stripe keys. `VITE_LAUNCH_MODE=live`, `VITE_SITE_MODE=first_batch`. Stripe test card: `4242 4242 4242 4242`, exp `12/29`, CVC `123`, postcode `SW1A 1AA`.

- [ ] **Step 1: Remove old tests**

```bash
rm -rf web/e2e/
```

- [ ] **Step 2: Verify playwright config**

Read `web/playwright.config.ts`. Confirm `testDir` points to `./e2e`, `baseURL` is `http://localhost:5173`, and `webServer` runs `npm run dev`. If not, update accordingly.

- [ ] **Step 3: Create `web/e2e/buy-flow.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

const GROUND_PRICE = '£65';
const RITUAL_PRICE = '£85';
const GROUND_PREMIUM = '£75';
const RITUAL_PREMIUM = '£95';

const TEST_USER = {
  firstName: 'Test',
  lastName:  'Buyer',
  email:     `e2e+${Date.now()}@bysolum.com`,
  phone:     '07700900000',
  line1:     '10 Downing Street',
  city:      'London',
  postcode:  'SW1A 2AA',
};

const CARD = {
  number:  '4242 4242 4242 4242',
  expiry:  '12 / 29',
  cvc:     '123',
};

async function fillForm(page, user = TEST_USER, kit = 'ground') {
  await page.selectOption('[data-testid="kit-select"]', kit);
  await page.fill('[name="first_name"]', user.firstName);
  await page.fill('[name="last_name"]',  user.lastName);
  await page.fill('[name="email"]',      user.email);
  await page.fill('[name="phone"]',      user.phone);
  await page.fill('[name="line1"]',      user.line1);
  await page.fill('[name="city"]',       user.city);
  await page.fill('[name="postcode"]',   user.postcode);
}

async function fillStripeCard(page) {
  const frame = page.frameLocator('iframe[name*="stripe"]').first();
  await frame.locator('[placeholder="Card number"]').fill(CARD.number);
  await frame.locator('[placeholder="MM / YY"]').fill(CARD.expiry);
  await frame.locator('[placeholder="CVC"]').fill(CARD.cvc);
}

// ─── 1. Kit selector shows correct prices ───────────────────────────────────

test('shows correct prices for first_batch source', async ({ page }) => {
  await page.goto('/buy');
  await expect(page.getByText(GROUND_PRICE)).toBeVisible();
  await page.selectOption('[data-testid="kit-select"]', 'ritual');
  await expect(page.getByText(RITUAL_PRICE)).toBeVisible();
});

test('shows premium prices for tiktok source', async ({ page }) => {
  await page.goto('/buy?source=tiktok');
  await expect(page.getByText(GROUND_PREMIUM)).toBeVisible();
  await page.selectOption('[data-testid="kit-select"]', 'ritual');
  await expect(page.getByText(RITUAL_PREMIUM)).toBeVisible();
});

test('shows premium prices for gift source', async ({ page }) => {
  await page.goto('/buy?source=gift');
  await expect(page.getByText(GROUND_PREMIUM)).toBeVisible();
});

// ─── 2. Stock counter visibility ────────────────────────────────────────────

test('shows stock counter for first_batch', async ({ page }) => {
  await page.goto('/buy');
  await expect(page.locator('[data-testid="stock-count"]')).toBeVisible();
});

test('hides stock counter for gift source', async ({ page }) => {
  await page.goto('/buy?source=gift');
  await expect(page.locator('[data-testid="stock-count"]')).not.toBeVisible();
});

test('hides stock counter for tiktok source', async ({ page }) => {
  await page.goto('/buy?source=tiktok');
  await expect(page.locator('[data-testid="stock-count"]')).not.toBeVisible();
});

// ─── 3. Form validation ──────────────────────────────────────────────────────

test('blocks submit when phone is empty', async ({ page }) => {
  await page.goto('/buy');
  await fillForm(page, { ...TEST_USER, phone: '' });
  await page.click('[data-testid="continue-btn"]');
  await expect(page.getByText(/phone number is required/i)).toBeVisible();
  // Still on stage 1 — PaymentElement not mounted
  await expect(page.locator('[data-testid="payment-element"]')).not.toBeVisible();
});

test('blocks submit when postcode is empty', async ({ page }) => {
  await page.goto('/buy');
  await fillForm(page, { ...TEST_USER, postcode: '' });
  await page.click('[data-testid="continue-btn"]');
  await expect(page.getByText(/postcode/i)).toBeVisible();
});

test('blocks submit when email is invalid', async ({ page }) => {
  await page.goto('/buy');
  await fillForm(page, { ...TEST_USER, email: 'notanemail' });
  await page.click('[data-testid="continue-btn"]');
  // HTML5 email validation or custom error
  const emailInput = page.locator('[name="email"]');
  const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
  expect(validity).toBe(false);
});

// ─── 4. Happy path — full purchase ──────────────────────────────────────────

test('completes one-time purchase and lands on success page', async ({ page }) => {
  await page.goto('/buy?kit=ground');
  await fillForm(page);
  await page.click('[data-testid="continue-btn"]');

  // Stage 2 — PaymentElement should appear
  await expect(page.locator('[data-testid="payment-element"]')).toBeVisible({ timeout: 10_000 });

  // Fill Stripe iframe
  await fillStripeCard(page);

  await page.click('[data-testid="pay-btn"]');

  // Should redirect to /success with one-time params
  await page.waitForURL(/\/success/, { timeout: 30_000 });
  await expect(page).toHaveURL(/source=first_batch/);
  await expect(page.getByText(/order confirmed/i)).toBeVisible();
});

// ─── 5. Success page — one-time copy ────────────────────────────────────────

test('success page shows one-time copy, no subscription messaging', async ({ page }) => {
  await page.goto('/success?kit=ground&source=first_batch&ref=pi_test_12345678');
  await expect(page.getByText(/we.ll check in at two weeks/i)).toBeVisible();
  await expect(page.getByText(/manage subscription/i)).not.toBeVisible();
  await expect(page.getByText(/monthly refills/i)).not.toBeVisible();
});

test('success page shows subscription copy for subscription source', async ({ page }) => {
  await page.goto('/success?kit=ground&ref=pi_test_12345678');
  await expect(page.getByText(/monthly refills arrive/i)).toBeVisible();
  await expect(page.getByText(/manage subscription/i)).toBeVisible();
});

test('success page shows order reference from ref param', async ({ page }) => {
  await page.goto('/success?kit=ground&source=first_batch&ref=pi_test_ABCDEFGH');
  await expect(page.getByText(/#ABCDEFGH/i)).toBeVisible();
});
```

- [ ] **Step 4: Add `data-testid` attributes to BuyPage**

Open `web/src/pages/BuyPage.jsx`. Add `data-testid` attributes to the elements the tests reference:

- Kit `<select>`: add `data-testid="kit-select"`
- Stock count element (`.by-stock-count` or similar): add `data-testid="stock-count"`
- Continue button: add `data-testid="continue-btn"`
- Payment element wrapper: add `data-testid="payment-element"`
- Pay button: add `data-testid="pay-btn"`

- [ ] **Step 5: Run tests locally**

```bash
cd web && npx playwright test e2e/buy-flow.spec.ts --headed
```

Expected: all tests pass. Fix any failures before proceeding.

- [ ] **Step 6: Run headless**

```bash
cd web && npx playwright test e2e/buy-flow.spec.ts
```

Expected: same pass rate headless.

- [ ] **Step 7: Commit**

```bash
git add web/e2e/ web/src/pages/BuyPage.jsx web/playwright.config.ts
git commit -m "test: replace e2e tests with /buy one-time purchase flow"
```

---

## Task 11: Father's Day Landing Page (`/fathers-day`)

**Files:**
- Create: `web/src/pages/FathersDayPage.jsx`
- Modify: `web/src/App.jsx` (add route)

**Context:** Father's Day ads will carry Father's Day-specific messaging. Without a dedicated landing page, these ads land on the homepage and the messaging mismatch kills conversion. This page needs to continue the Father's Day frame all the way to the `/buy?source=gift` CTA.

Father's Day 2026 (UK): **21 June 2026**. This page is a seasonal ad landing page — not a permanent nav item.

**Design:** Matches SOLUM aesthetic (dark, Bebas Neue, CSS variables). No nav bar. Eyebrow says "Father's Day Gift". Heading is large, emotional, Father's-Day-specific. Below the fold: kit options with prices, product list from the RITUAL kit (positioned as the gift pick), CTA goes to `/buy?source=gift&kit=ritual`.

- [ ] **Step 1: Create `web/src/pages/FathersDayPage.jsx`**

```jsx
import { Link } from 'react-router-dom';
import { KITS, PRODUCTS } from '../data/kits.js';

const ritual = KITS.find(k => k.id === 'ritual');
const ground = KITS.find(k => k.id === 'ground');

const CSS = `
.fd-page{min-height:100vh;background:var(--black);color:var(--bone);font-family:'Barlow Condensed',sans-serif;overflow-x:hidden;}
.fd-hero{position:relative;min-height:90vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 24px 60px;overflow:hidden;}
.fd-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(46,109,164,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(46,109,164,0.04) 1px,transparent 1px);background-size:80px 80px;pointer-events:none;}
.fd-glow{position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);width:900px;height:700px;background:radial-gradient(ellipse,rgba(46,109,164,0.09) 0%,transparent 70%);pointer-events:none;}
.fd-inner{position:relative;z-index:1;max-width:700px;width:100%;}
.fd-eyebrow{font-size:12px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:20px;}
.fd-heading{font-family:'Bebas Neue',sans-serif;font-size:clamp(64px,10vw,120px);letter-spacing:.04em;line-height:.9;color:var(--bone);margin-bottom:32px;}
.fd-heading span{color:var(--blit);}
.fd-subhead{font-size:18px;font-weight:300;color:var(--mist);line-height:1.6;max-width:520px;margin:0 auto 48px;}
.fd-cta-primary{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.12em;background:var(--bone);color:var(--black);padding:18px 48px;text-decoration:none;display:inline-block;transition:background .2s,transform .15s;margin-right:16px;}
.fd-cta-primary:hover{background:#fff;transform:translateY(-2px);}
.fd-cta-ghost{font-size:13px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);text-decoration:none;border-bottom:1px solid var(--lineb);padding-bottom:3px;transition:color .2s;display:inline-block;}
.fd-cta-ghost:hover{color:var(--bone);}
.fd-trust{display:flex;gap:32px;justify-content:center;flex-wrap:wrap;margin-top:48px;}
.fd-trust-item{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);display:flex;align-items:center;gap:8px;}
.fd-trust-dot{width:5px;height:5px;border-radius:50%;background:var(--blit);}

.fd-kits{padding:80px 24px;max-width:900px;margin:0 auto;}
.fd-section-label{font-size:12px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:40px;text-align:center;}
.fd-kit-cards{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.fd-kit-card{border:1px solid var(--lineb);padding:32px;background:var(--char);position:relative;cursor:pointer;transition:border-color .2s;}
.fd-kit-card.featured{border-color:var(--blue);}
.fd-kit-badge{position:absolute;top:-1px;left:50%;transform:translateX(-50%);background:var(--blue);font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--black);padding:4px 16px;font-weight:600;white-space:nowrap;}
.fd-kit-name{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.1em;color:var(--bone);margin-bottom:8px;}
.fd-kit-price{font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--blue);letter-spacing:.05em;margin-bottom:16px;}
.fd-kit-desc{font-size:14px;color:var(--stone);font-weight:300;line-height:1.6;margin-bottom:24px;}
.fd-kit-link{font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:.1em;background:var(--blue);color:var(--black);padding:12px 28px;text-decoration:none;display:inline-block;transition:background .2s;}
.fd-kit-link:hover{background:var(--blit);}
.fd-kit-card.featured .fd-kit-link{background:var(--bone);color:var(--black);}
.fd-kit-card.featured .fd-kit-link:hover{background:#fff;}

.fd-products{padding:0 24px 80px;max-width:720px;margin:0 auto;}
.fd-prod-label{font-size:12px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:32px;text-align:center;}
.fd-prod-list{display:flex;flex-direction:column;gap:0;border:1px solid var(--lineb);}
.fd-prod-item{display:flex;align-items:center;gap:20px;padding:20px 24px;border-bottom:1px solid var(--line);}
.fd-prod-item:last-child{border-bottom:none;}
.fd-prod-num{font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--blue);width:32px;flex-shrink:0;text-align:center;}
.fd-prod-name{font-size:15px;color:var(--bone);font-weight:500;}
.fd-prod-origin{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);margin-top:2px;}

.fd-bottom{padding:60px 24px;text-align:center;border-top:1px solid var(--line);}
.fd-bottom-copy{font-size:14px;color:var(--stone);font-weight:300;margin-bottom:24px;}

@media(max-width:640px){
  .fd-kit-cards{grid-template-columns:1fr;}
  .fd-kit-card.featured{margin-top:12px;}
  .fd-cta-primary{display:block;margin:0 0 16px;}
  .fd-cta-ghost{display:block;}
}
`;

const RITUAL_PRODUCTS = [
  { num: '01', name: 'Amino Acid Body Wash 250ml',  origin: 'Made in UK' },
  { num: '02', name: 'Exfoliating Mitt',            origin: 'Korean Bathhouse Tradition' },
  { num: '03', name: 'Back Scrub Cloth 70cm',       origin: 'Korean Bathhouse Tradition' },
  { num: '04', name: 'Silicone Scalp Massager',     origin: 'Made in Republic of Korea' },
  { num: '05', name: 'Rhassoul Clay Body Mask 200g',origin: 'Made in Morocco' },
  { num: '06', name: 'Organic Argan Body Oil 50ml', origin: 'Made in Morocco' },
  { num: '07', name: 'Fast-Absorb Body Lotion 400ml',origin: 'Made in UK' },
];

export default function FathersDayPage() {
  return (
    <>
      <style>{CSS}</style>
      <div className="fd-page">

        {/* Hero */}
        <div className="fd-hero">
          <div className="fd-glow" />
          <div className="fd-inner">
            <div className="fd-eyebrow">Father's Day Gift · 21 June</div>
            <h1 className="fd-heading">Give Him<br /><span>A Real</span><br />Routine.</h1>
            <p className="fd-subhead">
              Most men shower every day and still have rough skin, a neglected back, and a scalp they've never properly cleaned. SOLUM fixes that. A complete body care system — tools and consumables — built for a man who's never had one before.
            </p>
            <a href="/buy?source=gift&kit=ritual" className="fd-cta-primary">Get the Ritual Kit — £95 →</a>
            <a href="/buy?source=gift&kit=ground" className="fd-cta-ghost">GROUND Kit — £75</a>
            <div className="fd-trust">
              <span className="fd-trust-item"><span className="fd-trust-dot" />Ships Thursday or Monday</span>
              <span className="fd-trust-item"><span className="fd-trust-dot" />UK delivery · Royal Mail Tracked</span>
              <span className="fd-trust-item"><span className="fd-trust-dot" />One-time · No subscription</span>
            </div>
          </div>
        </div>

        {/* Kit selection */}
        <div className="fd-kits">
          <div className="fd-section-label">Choose the right kit</div>
          <div className="fd-kit-cards">
            <div className="fd-kit-card">
              <div className="fd-kit-name">GROUND</div>
              <div className="fd-kit-price">£75</div>
              <div className="fd-kit-desc">
                The daily system. Body wash, exfoliating mitt, back scrub cloth, scalp massager, body lotion. Everything he needs to actually clean his body — not just rinse it.
              </div>
              <a href="/buy?source=gift&kit=ground" className="fd-kit-link">Buy GROUND →</a>
            </div>
            <div className="fd-kit-card featured">
              <div className="fd-kit-badge">Most Popular Gift</div>
              <div className="fd-kit-name">RITUAL</div>
              <div className="fd-kit-price">£95</div>
              <div className="fd-kit-desc">
                Everything in GROUND, plus the Rhassoul Clay Mask and Argan Body Oil. The full 10-minute daily + 22-minute weekly system. Head to toe.
              </div>
              <a href="/buy?source=gift&kit=ritual" className="fd-kit-link">Buy RITUAL →</a>
            </div>
          </div>
        </div>

        {/* What's in the RITUAL Kit */}
        <div className="fd-products">
          <div className="fd-prod-label">What's inside the RITUAL Kit</div>
          <div className="fd-prod-list">
            {RITUAL_PRODUCTS.map(p => (
              <div className="fd-prod-item" key={p.num}>
                <span className="fd-prod-num">{p.num}</span>
                <div>
                  <div className="fd-prod-name">{p.name}</div>
                  <div className="fd-prod-origin">{p.origin}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="fd-bottom">
          <p className="fd-bottom-copy">
            Arrives before Father's Day when ordered by Sunday 15 June. Tracked Royal Mail delivery.
          </p>
          <a href="/buy?source=gift&kit=ritual" className="fd-cta-primary">Gift the RITUAL Kit — £95 →</a>
        </div>

      </div>
    </>
  );
}
```

- [ ] **Step 2: Add route to `App.jsx`**

Open `web/src/App.jsx`. Add the import:

```jsx
import FathersDayPage from './pages/FathersDayPage.jsx';
```

Add the route (alongside `/buy`, outside any `IS_LIVE` gate):

```jsx
<Route path="/fathers-day" element={<FathersDayPage />} />
```

- [ ] **Step 3: Verify locally**

Run `npm run dev`. Navigate to `http://localhost:5173/fathers-day`. Confirm:
- Page renders with correct dark SOLUM aesthetic
- RITUAL Kit card has "Most Popular Gift" badge
- Both kit CTAs link to `/buy?source=gift&kit=<kit>`
- Mobile layout stacks to single column correctly

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/FathersDayPage.jsx web/src/App.jsx
git commit -m "feat: fathers day landing page — /fathers-day route for gift ad conversion"
```

- [ ] **Step 5: Deploy**

Merge dev → master and push. Amplify will pick up automatically. Verify `https://bysolum.co.uk/fathers-day` is live before using in ads.

**Ad URL to use:** `https://bysolum.co.uk/fathers-day`

---

## Self-Review Notes

- `source` in migration uses check constraint to enumerate valid values — new values can be added via migration if needed.
- `handleOneTimeOrder` in webhook is fail-fast but inventory deduction errors are swallowed (same pattern as existing `deductInventory` wrapper) to avoid blocking order processing.
- `/buy` waitlist fallback (both sold out) uses a mailto link — simple, no new infra needed.
- `VITE_SITE_MODE` env var approach means flipping to subscription mode at Phase 2 is a single Amplify env var change + redeploy. No code change required.
- Task 10 (e2e) requires `data-testid` attributes added to BuyPage — these are not present in the current implementation and must be added as part of the task.
- Task 11 (Father's Day) uses hardcoded product list rather than importing from `kits.js` because the RITUAL-specific product names and origins aren't structured that way in the data file — simpler to inline.
- Father's Day order cutoff copy ("order by Sunday 15 June") is hardcoded — update if launch timing changes.
- Gift fields (recipient name/email/message) are not in this plan — they require the `gift_orders` table (separate spec). `/buy?source=gift` captures the purchase and tags the order; the full gift journey is a follow-on task.
