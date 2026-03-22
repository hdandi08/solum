# Address Capture + Customer Portal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture shipping address at Stripe Checkout and store it in Supabase; build a `/account` portal with magic-link login where customers can view their subscription, update their address, and cancel.

**Architecture:** Stripe's `shipping_address_collection` enforces address entry before payment; the existing `checkout.session.completed` webhook stores it in a new `addresses` table. Three new auth-gated Edge Functions (`get-account`, `check-customer`, `update-address`, `cancel-subscription`) serve the portal. The portal is a single React page (`AccountPage.jsx`) using Supabase Auth magic-link, linking auth users to `customers` via `supabase_user_id` — written atomically inside `get-account` on first login.

**Tech Stack:** Supabase (Postgres migrations, Edge Functions with Deno, Auth), Stripe API, React 19, `@supabase/supabase-js` v2 (already installed), Vite, deployed on AWS Amplify.

**Spec:** `docs/superpowers/specs/2026-03-22-address-and-customer-portal-design.md`

---

## File Map

| File | Action |
|------|--------|
| `supabase/migrations/20260322000000_create_core_tables.sql` | **Create** — customers, subscriptions, orders, events |
| `supabase/migrations/20260322000001_create_addresses.sql` | **Create** — addresses table |
| `supabase/functions/create-checkout-session/index.ts` | **Modify** — add `shipping_address_collection` |
| `supabase/functions/stripe-webhook/index.ts` | **Modify** — extract + store address on checkout.session.completed |
| `supabase/functions/check-customer/index.ts` | **Create** — validates email has a customer record (anon-key gated) |
| `supabase/functions/get-account/index.ts` | **Create** — loads customer + subscription + address; links supabase_user_id on first call |
| `supabase/functions/update-address/index.ts` | **Create** — auth-gated address update |
| `supabase/functions/cancel-subscription/index.ts` | **Create** — auth-gated cancellation |
| `web/src/lib/supabase.js` | **Create** — shared Supabase client singleton |
| `web/src/pages/AccountPage.jsx` | **Create** — login form + dashboard |
| `web/src/App.jsx` | **Modify** — add `/account` route |

---

## Task 1: Core tables migration

The webhook already writes to `customers`, `subscriptions`, `orders`, `events` — but the migrations don't exist. Everything else depends on this.

**Files:**
- Create: `supabase/migrations/20260322000000_create_core_tables.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260322000000_create_core_tables.sql

create table if not exists public.customers (
  id                 uuid        primary key default gen_random_uuid(),
  email              text        not null unique,
  first_name         text,
  last_name          text,
  birth_year         integer,
  birth_month        integer,
  stripe_customer_id text        unique,
  kit_id             text,
  subscribed_at      timestamptz,
  supabase_user_id   uuid        unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists customers_email_idx           on public.customers (email);
create index if not exists customers_stripe_customer_idx on public.customers (stripe_customer_id);
create index if not exists customers_supabase_user_idx   on public.customers (supabase_user_id);

create table if not exists public.subscriptions (
  id                     uuid        primary key default gen_random_uuid(),
  customer_id            uuid        not null references public.customers(id) on delete cascade,
  stripe_subscription_id text        unique,
  kit_id                 text,
  status                 text        not null default 'active',
  months_active          integer     not null default 0,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at              timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx   on public.subscriptions (customer_id);
create index if not exists subscriptions_stripe_sub_idx on public.subscriptions (stripe_subscription_id);
create index if not exists subscriptions_status_idx     on public.subscriptions (status);

create table if not exists public.orders (
  id                uuid        primary key default gen_random_uuid(),
  customer_id       uuid        not null references public.customers(id) on delete cascade,
  subscription_id   uuid        references public.subscriptions(id),
  stripe_payment_id text,
  kit_id            text,
  order_type        text        not null,
  box_number        integer,
  amount_pence      integer     not null default 0,
  status            text        not null default 'paid',
  created_at        timestamptz not null default now()
);

create index if not exists orders_customer_idx       on public.orders (customer_id);
create index if not exists orders_stripe_payment_idx on public.orders (stripe_payment_id);
create index if not exists orders_status_idx         on public.orders (status);

create table if not exists public.events (
  id              uuid        primary key default gen_random_uuid(),
  stripe_event_id text        unique,
  event_type      text        not null,
  customer_id     uuid        references public.customers(id),
  data            jsonb       not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists events_stripe_event_idx on public.events (stripe_event_id);
create index if not exists events_customer_idx     on public.events (customer_id);
create index if not exists events_type_idx         on public.events (event_type);
```

Note: `subscriptions` includes a `cancel_at` column (used by the portal to show the exact cancellation date when status is `cancelling`).

- [ ] **Step 2: Apply the migration**

```bash
supabase db push
```

Expected: migration applies cleanly. Verify in Supabase Dashboard → Table Editor that all four tables appear.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260322000000_create_core_tables.sql
git commit -m "feat: add core database tables (customers, subscriptions, orders, events)"
```

---

## Task 2: Addresses migration

**Files:**
- Create: `supabase/migrations/20260322000001_create_addresses.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260322000001_create_addresses.sql

create table if not exists public.addresses (
  id                uuid        primary key default gen_random_uuid(),
  customer_id       uuid        not null references public.customers(id) on delete cascade,
  stripe_session_id text,
  name              text        not null,
  line1             text        not null,
  line2             text,
  city              text        not null,
  postcode          text        not null,
  country           text        not null default 'GB',
  is_current        boolean     not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists addresses_customer_current_idx
  on public.addresses (customer_id, is_current);

-- Idempotency: prevent duplicate address rows from webhook retries
create unique index if not exists addresses_stripe_session_idx
  on public.addresses (stripe_session_id)
  where stripe_session_id is not null;
```

- [ ] **Step 2: Apply the migration**

```bash
supabase db push
```

Expected: `addresses` table appears in Supabase Dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260322000001_create_addresses.sql
git commit -m "feat: add addresses table with idempotency constraint"
```

---

## Task 3: Add shipping address collection to checkout session

**Files:**
- Modify: `supabase/functions/create-checkout-session/index.ts`

- [ ] **Step 1: Add `shipping_address_collection` to the session creation call**

In `create-checkout-session/index.ts`, find the `stripe.checkout.sessions.create(...)` call (around line 95) and add `shipping_address_collection` inside it:

```ts
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [
        { price: firstBoxPrice.id,  quantity: 1 },
        { price: monthlyPrice.id,   quantity: 1 },
      ],
      subscription_data: {
        trial_end: billingAnchor,
        metadata: { kit_id, birth_year: birth_year?.toString(), birth_month: birth_month?.toString() },
      },
      shipping_address_collection: {
        allowed_countries: ['GB'],
      },
      success_url,
      cancel_url,
      metadata: { kit_id, first_name, last_name, birth_year: birth_year?.toString(), birth_month: birth_month?.toString() },
    });
```

- [ ] **Step 2: Deploy the function**

```bash
supabase functions deploy create-checkout-session
```

- [ ] **Step 3: Verify**

Start a test-mode checkout. Confirm Stripe's hosted page shows an address section and cannot be completed without a UK address.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/create-checkout-session/index.ts
git commit -m "feat: require shipping address collection at Stripe checkout (GB only)"
```

---

## Task 4: Store address from webhook

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts`

- [ ] **Step 1: Add address insert inside the `checkout.session.completed` case**

After the `sendConfirmationEmail` call (around line 191) and before `break`, insert:

```ts
        // Store shipping address (null guard + idempotency via stripe_session_id unique index)
        const sd = session.shipping_details;
        if (sd?.address && customer) {
          await supabase.from('addresses').upsert({
            customer_id:       customer.id,
            stripe_session_id: session.id,
            name:              sd.name ?? '',
            line1:             sd.address.line1 ?? '',
            line2:             sd.address.line2 ?? null,
            city:              sd.address.city ?? '',
            postcode:          sd.address.postal_code ?? '',
            country:           sd.address.country ?? 'GB',
            is_current:        true,
            updated_at:        new Date().toISOString(),
          }, { onConflict: 'stripe_session_id' });
        } else {
          console.warn('No shipping_details on session', session.id);
        }
```

Note: `updated_at` is included so idempotent replays (duplicate webhook deliveries) correctly update the timestamp, making it easy to audit whether a row was replayed.

- [ ] **Step 2: Deploy the function**

```bash
supabase functions deploy stripe-webhook
```

- [ ] **Step 3: Verify**

Complete a test-mode Stripe checkout. Check Supabase Dashboard → `addresses` table for a row with `is_current = true`. Trigger a duplicate via Stripe CLI to confirm idempotency:

```bash
stripe trigger checkout.session.completed
```

Check that no duplicate row appears in `addresses`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts
git commit -m "feat: store shipping address from Stripe webhook on checkout completion"
```

---

## Task 5: Create `check-customer` Edge Function

Used by the login form to verify an email has a customer record before sending a magic link. Gated behind the Supabase anon key to prevent unauthenticated email enumeration.

**Files:**
- Create: `supabase/functions/check-customer/index.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p supabase/functions/check-customer
```

- [ ] **Step 2: Write the function**

```ts
// supabase/functions/check-customer/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Gate behind anon key — prevents unauthenticated email enumeration
  const apiKey = req.headers.get('apikey') ?? req.headers.get('Authorization')?.replace('Bearer ', '');
  if (apiKey !== ANON_KEY) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  const { email } = await req.json();
  if (!email) {
    return new Response(JSON.stringify({ exists: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  return new Response(JSON.stringify({ exists: !!data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 3: Deploy**

```bash
supabase functions deploy check-customer
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/check-customer/index.ts
git commit -m "feat: add check-customer edge function (anon-key gated)"
```

---

## Task 6: Create `get-account` Edge Function

Loads the full account state for the logged-in user. Also atomically writes `supabase_user_id` to the customer record on first login (eliminates the race condition that would exist if this were a separate call).

**Files:**
- Create: `supabase/functions/get-account/index.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p supabase/functions/get-account
```

- [ ] **Step 2: Write the function**

```ts
// supabase/functions/get-account/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  // Try to find customer by supabase_user_id first (all logins after the first)
  let { data: customer } = await supabase
    .from('customers')
    .select('id, email, first_name, last_name, kit_id, supabase_user_id')
    .eq('supabase_user_id', user.id)
    .maybeSingle();

  // First login: find by email and atomically link the supabase_user_id
  if (!customer) {
    const { data } = await supabase
      .from('customers')
      .select('id, email, first_name, last_name, kit_id, supabase_user_id')
      .eq('email', user.email!.trim().toLowerCase())
      .maybeSingle();
    customer = data;

    if (customer && !customer.supabase_user_id) {
      // Link this auth user to the customer record — idempotent (only runs if null)
      await supabase
        .from('customers')
        .update({ supabase_user_id: user.id, updated_at: new Date().toISOString() })
        .eq('id', customer.id)
        .is('supabase_user_id', null);
    }
  }

  if (!customer) {
    return new Response(JSON.stringify({ customer: null, subscription: null, address: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const [{ data: subscription }, { data: address }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, kit_id, status, months_active, current_period_end, cancel_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('addresses')
      .select('id, name, line1, line2, city, postcode, country')
      .eq('customer_id', customer.id)
      .eq('is_current', true)
      .maybeSingle(),
  ]);

  return new Response(JSON.stringify({ customer, subscription, address }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 3: Deploy**

```bash
supabase functions deploy get-account
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/get-account/index.ts
git commit -m "feat: add get-account edge function (loads account data, links supabase_user_id on first login)"
```

---

## Task 7: Create `update-address` Edge Function

**Files:**
- Create: `supabase/functions/update-address/index.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p supabase/functions/update-address
```

- [ ] **Step 2: Write the function**

```ts
// supabase/functions/update-address/index.ts
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const { data: customer } = await supabase
    .from('customers')
    .select('id, stripe_customer_id')
    .eq('supabase_user_id', user.id)
    .single();
  if (!customer) return new Response('Customer not found', { status: 404, headers: corsHeaders });

  const { name, line1, line2, city, postcode } = await req.json();
  if (!name || !line1 || !city || !postcode) {
    return new Response(JSON.stringify({ error: 'name, line1, city, postcode are required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Flip all existing current rows to not current (safe even if zero rows)
  await supabase.from('addresses')
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq('customer_id', customer.id)
    .eq('is_current', true);

  // Insert new current address
  const { data: newAddress, error: insertError } = await supabase
    .from('addresses')
    .insert({
      customer_id: customer.id,
      name,
      line1,
      line2: line2 || null,
      city,
      postcode,
      country: 'GB',
      is_current: true,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Address insert error:', insertError);
    return new Response(JSON.stringify({ error: 'Failed to save address' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Sync to Stripe
  if (customer.stripe_customer_id) {
    await stripe.customers.update(customer.stripe_customer_id, {
      shipping: {
        name,
        address: { line1, line2: line2 || undefined, city, postal_code: postcode, country: 'GB' },
      },
    });
  }

  return new Response(JSON.stringify(newAddress), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 3: Deploy**

```bash
supabase functions deploy update-address
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/update-address/index.ts
git commit -m "feat: add update-address edge function (auth-gated, syncs Stripe)"
```

---

## Task 8: Create `cancel-subscription` Edge Function

**Files:**
- Create: `supabase/functions/cancel-subscription/index.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p supabase/functions/cancel-subscription
```

- [ ] **Step 2: Write the function**

```ts
// supabase/functions/cancel-subscription/index.ts
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('supabase_user_id', user.id)
    .single();
  if (!customer) return new Response('Customer not found', { status: 404, headers: corsHeaders });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, stripe_subscription_id, status')
    .eq('customer_id', customer.id)
    .in('status', ['active', 'past_due'])
    .single();

  if (!sub) {
    return new Response(JSON.stringify({ error: 'No active subscription found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  // current_period_end is the actual end date when cancel_at_period_end is true
  const cancelAt = new Date(updated.current_period_end * 1000).toISOString();

  await supabase.from('subscriptions')
    .update({
      status: 'cancelling',
      cancel_at: cancelAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id);

  return new Response(JSON.stringify({ cancel_at: cancelAt }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 3: Deploy**

```bash
supabase functions deploy cancel-subscription
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/cancel-subscription/index.ts
git commit -m "feat: add cancel-subscription edge function (cancel_at_period_end, stores cancel_at)"
```

---

## Task 9: Supabase client singleton + set SUPABASE_ANON_KEY secret

**Files:**
- Create: `web/src/lib/supabase.js`

- [ ] **Step 1: Create the singleton**

```js
// web/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

- [ ] **Step 2: Set `SUPABASE_ANON_KEY` as an Edge Function secret**

The auth-gated functions need `SUPABASE_ANON_KEY` to verify JWTs. Get the value from Supabase Dashboard → Project Settings → API → "anon/public" key, then:

```bash
supabase secrets set SUPABASE_ANON_KEY=<your-anon-key>
```

- [ ] **Step 3: Redeploy all functions to pick up the secret**

```bash
supabase functions deploy check-customer
supabase functions deploy get-account
supabase functions deploy update-address
supabase functions deploy cancel-subscription
```

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/supabase.js
git commit -m "feat: add shared Supabase client singleton"
```

---

## Task 10: Build AccountPage

**Files:**
- Create: `web/src/pages/AccountPage.jsx`

Build top-to-bottom: CSS → LoadingView → LoginView → Dashboard → default export.

- [ ] **Step 1: Create the file with CSS and auth shell**

```jsx
// web/src/pages/AccountPage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY;

const CSS = `
.ac-page{min-height:100vh;background:var(--black);display:flex;align-items:center;justify-content:center;padding:48px 24px;font-family:'Barlow Condensed',sans-serif;}
.ac-wrap{width:100%;max-width:640px;}
.ac-logo{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.15em;color:var(--bone);margin-bottom:48px;display:block;}
.ac-heading{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,5vw,56px);letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:8px;}
.ac-sub{font-size:16px;color:var(--stone);font-weight:300;margin-bottom:40px;line-height:1.5;}
.ac-input{width:100%;background:var(--dark);border:1px solid var(--lineb);color:var(--bone);padding:14px 16px;font-family:'Barlow Condensed',sans-serif;font-size:16px;outline:none;transition:border-color .2s;box-sizing:border-box;}
.ac-input:focus{border-color:var(--blue);}
.ac-btn{width:100%;background:var(--bone);color:var(--black);border:none;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.15em;padding:18px;cursor:pointer;transition:background .2s;margin-top:12px;}
.ac-btn:hover:not(:disabled){background:#fff;}
.ac-btn:disabled{background:var(--stone);cursor:wait;}
.ac-btn-ghost{width:100%;background:transparent;color:var(--stone);border:1px solid var(--lineb);font-family:'Barlow Condensed',sans-serif;font-size:14px;letter-spacing:2px;text-transform:uppercase;padding:12px;cursor:pointer;margin-top:8px;transition:border-color .2s,color .2s;}
.ac-btn-ghost:hover{border-color:var(--bone);color:var(--bone);}
.ac-err{font-size:14px;color:#e05c5c;margin-top:12px;padding:12px 16px;border:1px solid rgba(224,92,92,0.3);}
.ac-panel{border:1px solid var(--lineb);margin-bottom:16px;}
.ac-panel-head{padding:20px 24px;border-bottom:1px solid var(--lineb);display:flex;align-items:center;justify-content:space-between;}
.ac-panel-label{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:600;}
.ac-panel-body{padding:24px;}
.ac-field-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;margin-bottom:6px;}
.ac-field-value{font-size:16px;color:var(--bone);font-weight:300;margin-bottom:16px;line-height:1.5;}
.ac-badge{display:inline-block;font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:700;padding:4px 10px;}
.ac-badge-active{background:rgba(74,143,199,0.15);color:#4A8FC7;}
.ac-badge-cancelling{background:rgba(200,149,42,0.12);color:#c8952a;}
.ac-badge-cancelled{background:rgba(168,180,188,0.1);color:var(--stone);}
.ac-badge-paused{background:rgba(168,180,188,0.1);color:var(--stone);}
.ac-badge-past_due{background:rgba(224,92,92,0.12);color:#e05c5c;}
.ac-addr-empty{font-size:15px;color:var(--stone);font-weight:300;font-style:italic;}
.ac-confirm-box{background:rgba(224,92,92,0.05);border:1px solid rgba(224,92,92,0.2);padding:20px;margin-top:16px;}
.ac-confirm-text{font-size:15px;color:var(--mist);line-height:1.6;margin-bottom:16px;}
.ac-btn-danger{background:#c0392b;color:#fff;border:none;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.1em;padding:14px 24px;cursor:pointer;margin-right:12px;}
.ac-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.ac-form-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
.ac-form-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.ac-form-input{background:var(--dark);border:1px solid var(--lineb);color:var(--bone);padding:12px 14px;font-family:'Barlow Condensed',sans-serif;font-size:15px;outline:none;}
.ac-form-input:focus{border-color:var(--blue);}
.ac-signout{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);background:none;border:none;cursor:pointer;padding:0;margin-top:24px;}
.ac-signout:hover{color:var(--bone);}
.ac-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:40px;}
@media(max-width:480px){.ac-form-row{grid-template-columns:1fr;}}
`;

function LoadingView() {
  return (
    <div className="ac-page">
      <style>{CSS}</style>
      <div className="ac-wrap">
        <span className="ac-logo">SOLUM</span>
        <div style={{color:'var(--stone)',fontSize:14,letterSpacing:2,textTransform:'uppercase'}}>Loading…</div>
      </div>
    </div>
  );
}

function LoginView({ phase, setPhase }) {
  const [email, setEmail]     = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');

  async function handleSend(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    // Always normalise email to lowercase to match stored customer records
    const normalisedEmail = email.trim().toLowerCase();
    try {
      const checkRes = await fetch(`${SUPABASE_URL}/functions/v1/check-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({ email: normalisedEmail }),
      });
      const { exists } = await checkRes.json();
      if (!exists) {
        setError('No account found for this email. If you think this is wrong, email contact@bysolum.com.');
        setSending(false);
        return;
      }
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalisedEmail,
        options: { emailRedirectTo: `${window.location.origin}/account` },
      });
      if (otpError) throw otpError;
      setPhase('sent');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (phase === 'sent') {
    return (
      <div className="ac-page">
        <style>{CSS}</style>
        <div className="ac-wrap">
          <span className="ac-logo">SOLUM</span>
          <div className="ac-heading">Check Your Email.</div>
          <div className="ac-sub">
            We've sent a login link to <strong style={{color:'var(--bone)'}}>{email.trim().toLowerCase()}</strong>.<br />
            Click it to access your account. The link expires in 1 hour.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ac-page">
      <style>{CSS}</style>
      <div className="ac-wrap">
        <span className="ac-logo">SOLUM</span>
        <div className="ac-heading">Your Account.</div>
        <div className="ac-sub">Enter your email and we'll send you a login link. No password needed.</div>
        <form onSubmit={handleSend}>
          <input
            className="ac-input"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          {error && <div className="ac-err">{error}</div>}
          <button className="ac-btn" type="submit" disabled={sending || !email}>
            {sending ? 'Sending…' : 'Send Login Link'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({ session, customer, sub, address, setAddress, setSub }) {
  const [editingAddress, setEditingAddress] = useState(false);
  const [addrForm, setAddrForm]             = useState({ name: '', line1: '', line2: '', city: '', postcode: '' });
  const [addrSaving, setAddrSaving]         = useState(false);
  const [addrError, setAddrError]           = useState('');
  const [confirmCancel, setConfirmCancel]   = useState(false);
  const [cancelling, setCancelling]         = useState(false);
  // Initialise from sub.cancel_at so returning visitors see the correct date
  const [cancelledUntil, setCancelledUntil] = useState(sub?.cancel_at ?? null);

  function startEditAddress() {
    setAddrForm({
      name:     address?.name ?? [customer?.first_name, customer?.last_name].filter(Boolean).join(' '),
      line1:    address?.line1    ?? '',
      line2:    address?.line2    ?? '',
      city:     address?.city     ?? '',
      postcode: address?.postcode ?? '',
    });
    setAddrError('');
    setEditingAddress(true);
  }

  async function saveAddress(e) {
    e.preventDefault();
    setAddrSaving(true);
    setAddrError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-address`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addrForm),
      });
      if (!res.ok) throw new Error('Failed to save address');
      const updated = await res.json();
      setAddress(updated);
      setEditingAddress(false);
    } catch (err) {
      setAddrError(err.message);
    } finally {
      setAddrSaving(false);
    }
  }

  async function cancelSubscription() {
    setCancelling(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to cancel');
      const { cancel_at } = await res.json();
      setSub(s => ({ ...s, status: 'cancelling', cancel_at }));
      setCancelledUntil(cancel_at);
      setConfirmCancel(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setCancelling(false);
    }
  }

  const statusBadge = {
    active:     { label: 'Active',     cls: 'ac-badge-active'     },
    cancelling: { label: 'Cancelling', cls: 'ac-badge-cancelling' },
    cancelled:  { label: 'Cancelled',  cls: 'ac-badge-cancelled'  },
    paused:     { label: 'Paused',     cls: 'ac-badge-paused'     },
    past_due:   { label: 'Past Due',   cls: 'ac-badge-past_due'   },
  }[sub?.status] ?? { label: sub?.status ?? '—', cls: '' };

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const nextBillingDate = formatDate(sub?.current_period_end);
  const cancelDate      = formatDate(cancelledUntil ?? sub?.cancel_at);

  return (
    <div className="ac-page">
      <style>{CSS}</style>
      <div className="ac-wrap">

        <div className="ac-header">
          <span className="ac-logo" style={{marginBottom:0}}>SOLUM</span>
          <button className="ac-signout" onClick={() => { setPhase('login'); supabase.auth.signOut(); }}>Sign out</button>
        </div>

        <div className="ac-heading" style={{marginBottom:4}}>Your Account.</div>
        <div className="ac-sub" style={{marginBottom:32}}>Hello, {customer?.first_name ?? 'there'}.</div>

        {/* Panel 1 — Subscription */}
        <div className="ac-panel">
          <div className="ac-panel-head">
            <span className="ac-panel-label">Subscription</span>
            <span className={`ac-badge ${statusBadge.cls}`}>{statusBadge.label}</span>
          </div>
          <div className="ac-panel-body">
            <div className="ac-field-label">Kit</div>
            <div className="ac-field-value">{sub?.kit_id?.toUpperCase() ?? '—'}</div>

            {sub?.status === 'active' && (
              <>
                <div className="ac-field-label">Next billing date</div>
                <div className="ac-field-value">{nextBillingDate}</div>
              </>
            )}
            {sub?.status === 'cancelling' && (
              <div style={{fontSize:14,color:'#c8952a',lineHeight:1.6}}>
                Your subscription is set to cancel on {cancelDate}. No further boxes will be sent after that date.
              </div>
            )}
            {sub?.status === 'past_due' && (
              <div style={{fontSize:14,color:'#e05c5c',lineHeight:1.6}}>
                Your last payment failed. Email us at <a href="mailto:contact@bysolum.com" style={{color:'#e05c5c'}}>contact@bysolum.com</a> and we'll send you a secure link to update your payment method.
              </div>
            )}
            <div className="ac-field-label" style={{marginTop:sub?.status === 'active' ? 0 : 16}}>Months active</div>
            <div className="ac-field-value" style={{marginBottom:0}}>{sub?.months_active ?? 0}</div>
          </div>
        </div>

        {/* Panel 2 — Address */}
        <div className="ac-panel">
          <div className="ac-panel-head">
            <span className="ac-panel-label">Shipping Address</span>
            {!editingAddress && (
              <button
                className="ac-btn-ghost"
                style={{width:'auto',padding:'6px 16px',marginTop:0,fontSize:11,letterSpacing:3}}
                onClick={startEditAddress}
              >
                {address ? 'Update' : 'Add'}
              </button>
            )}
          </div>
          <div className="ac-panel-body">
            {!editingAddress && (
              address ? (
                <div className="ac-field-value" style={{marginBottom:0}}>
                  {address.name}<br />
                  {address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />
                  {address.city}<br />
                  {address.postcode}<br />
                  United Kingdom
                </div>
              ) : (
                <div className="ac-addr-empty">No shipping address on file — please add one.</div>
              )
            )}

            {editingAddress && (
              <form onSubmit={saveAddress}>
                <div className="ac-form-field">
                  <label className="ac-form-label">Full name</label>
                  <input className="ac-form-input" value={addrForm.name} onChange={e => setAddrForm(f => ({...f, name: e.target.value}))} required />
                </div>
                <div className="ac-form-field">
                  <label className="ac-form-label">Address line 1</label>
                  <input className="ac-form-input" value={addrForm.line1} onChange={e => setAddrForm(f => ({...f, line1: e.target.value}))} required />
                </div>
                <div className="ac-form-field">
                  <label className="ac-form-label">Address line 2 (optional)</label>
                  <input className="ac-form-input" value={addrForm.line2} onChange={e => setAddrForm(f => ({...f, line2: e.target.value}))} />
                </div>
                <div className="ac-form-row">
                  <div className="ac-form-field">
                    <label className="ac-form-label">City</label>
                    <input className="ac-form-input" value={addrForm.city} onChange={e => setAddrForm(f => ({...f, city: e.target.value}))} required />
                  </div>
                  <div className="ac-form-field">
                    <label className="ac-form-label">Postcode</label>
                    <input className="ac-form-input" value={addrForm.postcode} onChange={e => setAddrForm(f => ({...f, postcode: e.target.value}))} required />
                  </div>
                </div>
                <div className="ac-form-field" style={{marginBottom:16}}>
                  <label className="ac-form-label">Country</label>
                  <div style={{fontSize:15,color:'var(--stone)',padding:'12px 0'}}>United Kingdom</div>
                </div>
                {addrError && <div className="ac-err">{addrError}</div>}
                <button className="ac-btn" type="submit" disabled={addrSaving}>{addrSaving ? 'Saving…' : 'Save Address'}</button>
                <button className="ac-btn-ghost" type="button" onClick={() => setEditingAddress(false)}>Cancel</button>
              </form>
            )}
          </div>
        </div>

        {/* Panel 3 — Cancel (only if active or cancelling) */}
        {(sub?.status === 'active' || sub?.status === 'cancelling') && (
          <div className="ac-panel">
            <div className="ac-panel-head">
              <span className="ac-panel-label">Cancel Subscription</span>
            </div>
            <div className="ac-panel-body">
              {sub.status === 'cancelling' ? (
                <div style={{fontSize:15,color:'var(--stone)',fontWeight:300}}>
                  Your cancellation is already scheduled for {cancelDate}.
                </div>
              ) : (
                <>
                  <div style={{fontSize:15,color:'var(--stone)',fontWeight:300,lineHeight:1.6,marginBottom:16}}>
                    You can cancel at any time. Your subscription will remain active until the end of the current billing period.
                  </div>
                  {!confirmCancel && (
                    <button
                      className="ac-btn-ghost"
                      style={{width:'auto',padding:'10px 20px',color:'#e05c5c',borderColor:'rgba(224,92,92,0.3)'}}
                      onClick={() => setConfirmCancel(true)}
                    >
                      Cancel subscription
                    </button>
                  )}
                  {confirmCancel && (
                    <div className="ac-confirm-box">
                      <div className="ac-confirm-text">
                        Your subscription will remain active until <strong>{nextBillingDate}</strong>. After that, no further boxes will be sent.
                      </div>
                      <button className="ac-btn-danger" onClick={cancelSubscription} disabled={cancelling}>
                        {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                      </button>
                      <button
                        className="ac-btn-ghost"
                        style={{width:'auto',padding:'10px 20px'}}
                        onClick={() => setConfirmCancel(false)}
                      >
                        Keep my subscription
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function AccountPage() {
  const [phase, setPhase]       = useState('loading');
  const [session, setSession]   = useState(null);
  const [customer, setCustomer] = useState(null);
  const [sub, setSub]           = useState(null);
  const [address, setAddress]   = useState(null);

  useEffect(() => {
    // Use onAuthStateChange as the single source of truth for session state.
    // INITIAL_SESSION fires immediately with the existing session (or null),
    // avoiding a double fetch that getSession() + onAuthStateChange would cause.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSession(session);
        // Only load data on genuine auth events, not every re-render
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          loadCustomerData(session);
        }
      } else {
        setSession(null);
        setCustomer(null);
        setSub(null);
        setAddress(null);
        setPhase('login');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadCustomerData(session) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-account`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setPhase('login'); return; }
      const { customer, subscription, address } = await res.json();
      if (!customer) { setPhase('login'); return; }
      setCustomer(customer);
      setSub(subscription);
      setAddress(address);
      setPhase('dashboard');
    } catch {
      setPhase('login');
    }
  }

  if (phase === 'loading')                    return <LoadingView />;
  if (phase === 'login' || phase === 'sent')  return <LoginView phase={phase} setPhase={setPhase} />;
  return (
    <Dashboard
      session={session}
      customer={customer}
      sub={sub}
      address={address}
      setAddress={setAddress}
      setSub={setSub}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/AccountPage.jsx web/src/lib/supabase.js
git commit -m "feat: account page — login form and customer dashboard"
```

---

## Task 11: Add /account route to App.jsx

**Files:**
- Modify: `web/src/App.jsx`

- [ ] **Step 1: Add import and route**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ComingSoon from './pages/ComingSoon';
import FullSite from './pages/FullSite';
import CheckoutPage from './pages/CheckoutPage';
import SuccessPage from './pages/SuccessPage';
import AccountPage from './pages/AccountPage';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ComingSoon />} />
        <Route path="/full" element={<FullSite />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/App.jsx
git commit -m "feat: add /account route"
```

---

## Task 12: End-to-end test

- [ ] **Step 1: Test address capture at checkout**
  1. Start a test-mode checkout (kit=ground)
  2. Stripe checkout page must show an address section — if it doesn't, `create-checkout-session` was not redeployed
  3. Complete with test card `4242 4242 4242 4242`, use a UK address
  4. Check Supabase → `addresses` table: row with `is_current = true`
  5. Check `customers`, `subscriptions` tables: rows created correctly
  6. Trigger a second webhook delivery (via Stripe Dashboard → Events → resend) — confirm no duplicate address row appears

- [ ] **Step 2: Test magic link login**
  1. Visit `/account` — should show login form
  2. Enter email used in Step 1 → "Send Login Link" button
  3. Check inbox — click the login link
  4. Should land on `/account` showing the dashboard
  5. Check Supabase → `customers.supabase_user_id` — should now be populated

- [ ] **Step 3: Verify address display and update**
  1. Dashboard shows the address from checkout
  2. Click "Update" → form appears pre-populated
  3. Change postcode → Save
  4. Dashboard refreshes with new address
  5. Check Supabase → `addresses`: old row `is_current = false`, new row `is_current = true`
  6. Check Stripe Dashboard → Customer → Shipping: updated address shown

- [ ] **Step 4: Test cancellation**
  1. Click "Cancel subscription" → confirmation step appears with the billing period end date
  2. Click "Yes, cancel"
  3. Panel badge changes to "Cancelling", date shown
  4. Reload the page — date still shows correctly (loaded from `sub.cancel_at`)
  5. Check Stripe Dashboard → Subscription: "Cancels on [date]"
  6. Check Supabase → `subscriptions`: `status = 'cancelling'`, `cancel_at` populated

- [ ] **Step 5: Test unknown email**
  1. Visit `/account`, enter an email that is NOT in `customers`
  2. Should show "No account found for this email" — no magic link sent

---

## Task 13: Build and deploy to Amplify

- [ ] **Step 1: Build locally**

```bash
cd web && npm run build
```

Expected: clean build, no errors.

- [ ] **Step 2: Push to master**

```bash
git push origin master
```

- [ ] **Step 3: Verify on live site**
  - `/account` loads and shows login form
  - T-shirt image shows on loyalty section and checkout overlay (fixed separately)
  - Magic link from Supabase email redirects to `https://bysolum.com/account` and authenticates correctly

---

## Notes for implementer

- `get-account` handles the `supabase_user_id` link atomically — there is no separate `link-account` call. On first login it finds the customer by email, writes the `user.id`, then returns data. All subsequent calls resolve by `supabase_user_id` directly.
- `check-customer` requires the Supabase anon key as `apikey` header. This is intentional — it prevents unauthenticated email enumeration while still being callable from the public-facing login form.
- `cancelledUntil` in the Dashboard is initialised from `sub?.cancel_at` on mount. This means returning visitors (already in `cancelling` status) see the correct date immediately without needing to cancel again.
- The `cancel_at` column on `subscriptions` maps to Stripe's `current_period_end` at the time `cancel_at_period_end` is set. It is NOT the same as Stripe's `cancel_at` field (which is only set when `cancel_at` is explicitly specified in the Stripe API).
- Stripe's `customer.subscription.deleted` webhook (already handled) fires when the subscription actually expires and sets `status = 'cancelled'` in Supabase. The portal will then hide Panel 3.
