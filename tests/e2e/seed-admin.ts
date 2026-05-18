/**
 * Seed DEV with realistic admin test data.
 *
 * Run: npx tsx scripts/seed-dev-admin.ts
 *
 * Creates 4 customers across both kits covering every admin scenario:
 *   - Active subscriber, all payments good
 *   - Past-due subscriber (1 failed payment, retrying)
 *   - Unpaid subscriber (4 failures exhausted, payment_issue open)
 *   - Long-term active subscriber
 *
 * Safe to re-run — cleans seed data (emails ending @seed.bysolum.com) first.
 */

import { createClient } from '@supabase/supabase-js'

const DEV_URL = 'https://rodvvmfzkyjsqbufkjbc.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvZHZ2bWZ6a3lqc3FidWZramJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ4MzAyMCwiZXhwIjoyMDkxMDU5MDIwfQ.NyjNl5TdjwPxp6tUt7cmNz-2E5SBO8CW4EKWCJrkgWQ'

const db = createClient(DEV_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SEED_DOMAIN = '@seed.bysolum.com'
const now = new Date()
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400_000).toISOString()
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400_000).toISOString()

// ── Customers ─────────────────────────────────────────────────────────────────

const CUSTOMERS = [
  {
    email: `james.carter${SEED_DOMAIN}`,
    first_name: 'James', last_name: 'Carter',
    kit_id: 'ritual',
    subscribed_at: daysAgo(120),
    scenario: 'active_good',          // 4 months, all payments succeeded
  },
  {
    email: `marcus.webb${SEED_DOMAIN}`,
    first_name: 'Marcus', last_name: 'Webb',
    kit_id: 'ground',
    subscribed_at: daysAgo(60),
    scenario: 'past_due',             // 2 months, 1 payment failed, retrying
  },
  {
    email: `daniel.ross${SEED_DOMAIN}`,
    first_name: 'Daniel', last_name: 'Ross',
    kit_id: 'ritual',
    subscribed_at: daysAgo(35),
    scenario: 'unpaid',               // 1 month, all 4 retries failed → payment_issue
  },
  {
    email: `thomas.blake${SEED_DOMAIN}`,
    first_name: 'Thomas', last_name: 'Blake',
    kit_id: 'ground',
    subscribed_at: daysAgo(210),
    scenario: 'active_long',          // 7 months, long-term
  },
]

// ── Clean up ──────────────────────────────────────────────────────────────────

async function cleanSeedData() {
  console.log('Cleaning previous seed data...')
  const { data: existing } = await db
    .from('customers')
    .select('id')
    .like('email', `%${SEED_DOMAIN}`)

  if (existing?.length) {
    const ids = existing.map(c => c.id)
    await db.from('payment_issues').delete().in('customer_id', ids)
    await db.from('payment_attempts').delete().in('customer_id', ids)
    await db.from('orders').delete().in('customer_id', ids)
    await db.from('subscriptions').delete().in('customer_id', ids)
    await db.from('addresses').delete().in('customer_id', ids)
    await db.from('customers').delete().in('id', ids)
  }

  // Clean bookkeeping seed entries
  await db.from('bookkeeping_entries').delete().like('description', '%[seed]%')
  console.log(`  Removed ${existing?.length ?? 0} existing seed customers`)
}

// ── Customers + addresses ─────────────────────────────────────────────────────

async function seedCustomers() {
  console.log('Seeding customers...')
  const inserted: Record<string, string> = {}

  for (const c of CUSTOMERS) {
    const { data } = await db
      .from('customers')
      .insert({
        email: c.email,
        first_name: c.first_name,
        last_name: c.last_name,
        kit_id: c.kit_id,
        subscribed_at: c.subscribed_at,
        stripe_customer_id: `cus_seed_${c.first_name.toLowerCase()}`,
      })
      .select('id')
      .single()

    if (!data) throw new Error(`Failed to insert customer ${c.email}`)
    inserted[c.scenario] = data.id
    console.log(`  ${c.first_name} ${c.last_name} → ${data.id}`)
  }

  return inserted
}

async function seedAddresses(customerIds: Record<string, string>) {
  console.log('Seeding addresses...')
  const addresses = [
    { scenario: 'active_good',  name: 'James Carter',  line1: '14 Kensington Gardens', city: 'London',     postcode: 'W8 4PX',  phone: '+44 7911 123456' },
    { scenario: 'past_due',     name: 'Marcus Webb',   line1: '52 Bold Street',        city: 'Liverpool',  postcode: 'L1 4EA',  phone: '+44 7922 234567' },
    { scenario: 'unpaid',       name: 'Daniel Ross',   line1: '8 Corn Exchange',        city: 'Manchester', postcode: 'M4 3TR',  phone: '+44 7933 345678' },
    { scenario: 'active_long',  name: 'Thomas Blake',  line1: '27 George Street',      city: 'Edinburgh',  postcode: 'EH2 2PA', phone: '+44 7944 456789' },
  ]

  for (const a of addresses) {
    await db.from('addresses').insert({
      customer_id: customerIds[a.scenario],
      stripe_session_id: `cs_seed_${a.scenario}`,
      name: a.name,
      line1: a.line1,
      city: a.city,
      postcode: a.postcode,
      country: 'GB',
      phone: a.phone,
      is_current: true,
    })
  }
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

async function seedSubscriptions(customerIds: Record<string, string>) {
  console.log('Seeding subscriptions...')
  const subs: Record<string, string> = {}

  const specs = [
    {
      scenario: 'active_good',
      kit_id: 'ground', // overridden below
      months_active: 4,
      payment_status: 'active',
      consecutive_failures: 0,
      last_payment_at: daysAgo(18),
      next_payment_due: daysFromNow(7),
    },
    {
      scenario: 'past_due',
      months_active: 2,
      payment_status: 'past_due',
      consecutive_failures: 1,
      last_payment_at: daysAgo(35),
      next_payment_due: daysAgo(5),   // overdue
    },
    {
      scenario: 'unpaid',
      months_active: 1,
      payment_status: 'unpaid',
      consecutive_failures: 4,
      last_payment_at: daysAgo(65),
      next_payment_due: daysAgo(14),  // very overdue
    },
    {
      scenario: 'active_long',
      months_active: 7,
      payment_status: 'active',
      consecutive_failures: 0,
      last_payment_at: daysAgo(12),
      next_payment_due: daysFromNow(18),
    },
  ]

  for (const s of specs) {
    const customer = CUSTOMERS.find(c => c.scenario === s.scenario)!
    const { data } = await db
      .from('subscriptions')
      .insert({
        customer_id: customerIds[s.scenario],
        stripe_subscription_id: `sub_seed_${s.scenario}`,
        kit_id: customer.kit_id,
        status: 'active',
        months_active: s.months_active,
        payment_status: s.payment_status,
        consecutive_failures: s.consecutive_failures,
        last_payment_at: s.last_payment_at,
        next_payment_due: s.next_payment_due,
        current_period_start: daysAgo(18),
        current_period_end: daysFromNow(12),
        subscription_number: 1,
      })
      .select('id')
      .single()

    if (!data) throw new Error(`Failed to insert subscription for ${s.scenario}`)
    subs[s.scenario] = data.id
    console.log(`  ${s.scenario} → sub ${data.id} (${s.payment_status})`)
  }

  return subs
}

// ── Orders ────────────────────────────────────────────────────────────────────

async function seedOrders(
  customerIds: Record<string, string>,
  subIds: Record<string, string>,
) {
  console.log('Seeding orders...')

  const orderGroups: {
    scenario: string
    orders: {
      order_type: string
      box_number: number | null
      amount_pence: number
      status: string
      dispatch_status: string
      tracking_number: string | null
      carrier: string
      dispatched_at: string | null
      created_at: string
    }[]
  }[] = [
    {
      scenario: 'active_good',
      orders: [
        { order_type: 'first_box', box_number: null, amount_pence: 8500, status: 'paid', dispatch_status: 'delivered', tracking_number: 'RM123456789GB', carrier: 'royal-mail', dispatched_at: daysAgo(118), created_at: daysAgo(120) },
        { order_type: 'refill',    box_number: 1,    amount_pence: 4800, status: 'paid', dispatch_status: 'delivered', tracking_number: 'RM234567890GB', carrier: 'royal-mail', dispatched_at: daysAgo(88),  created_at: daysAgo(90) },
        { order_type: 'refill',    box_number: 2,    amount_pence: 4800, status: 'paid', dispatch_status: 'delivered', tracking_number: 'RM345678901GB', carrier: 'royal-mail', dispatched_at: daysAgo(58),  created_at: daysAgo(60) },
        { order_type: 'refill',    box_number: 3,    amount_pence: 4800, status: 'paid', dispatch_status: 'dispatched', tracking_number: 'RM456789012GB', carrier: 'royal-mail', dispatched_at: daysAgo(16),  created_at: daysAgo(18) },
        { order_type: 'refill',    box_number: 4,    amount_pence: 4800, status: 'paid', dispatch_status: 'pending',   tracking_number: null,            carrier: 'royal-mail', dispatched_at: null,          created_at: daysAgo(1) },
      ],
    },
    {
      scenario: 'past_due',
      orders: [
        { order_type: 'first_box', box_number: null, amount_pence: 6500, status: 'paid', dispatch_status: 'delivered', tracking_number: 'RM567890123GB', carrier: 'royal-mail', dispatched_at: daysAgo(58), created_at: daysAgo(60) },
        { order_type: 'refill',    box_number: 1,    amount_pence: 3800, status: 'paid', dispatch_status: 'delivered', tracking_number: 'RM678901234GB', carrier: 'royal-mail', dispatched_at: daysAgo(28), created_at: daysAgo(30) },
      ],
    },
    {
      scenario: 'unpaid',
      orders: [
        { order_type: 'first_box', box_number: null, amount_pence: 8500, status: 'paid', dispatch_status: 'delivered', tracking_number: 'RM789012345GB', carrier: 'royal-mail', dispatched_at: daysAgo(33), created_at: daysAgo(35) },
      ],
    },
    {
      scenario: 'active_long',
      orders: [
        { order_type: 'first_box', box_number: null, amount_pence: 6500, status: 'paid', dispatch_status: 'delivered', tracking_number: 'RM890123456GB', carrier: 'royal-mail', dispatched_at: daysAgo(208), created_at: daysAgo(210) },
        { order_type: 'refill',    box_number: 1,    amount_pence: 3800, status: 'paid', dispatch_status: 'delivered', tracking_number: 'RM901234567GB', carrier: 'royal-mail', dispatched_at: daysAgo(178), created_at: daysAgo(180) },
        { order_type: 'refill',    box_number: 2,    amount_pence: 3800, status: 'paid', dispatch_status: 'delivered', tracking_number: 'RM012345678GB', carrier: 'royal-mail', dispatched_at: daysAgo(148), created_at: daysAgo(150) },
        { order_type: 'refill',    box_number: 3,    amount_pence: 3800, status: 'paid', dispatch_status: 'delivered', tracking_number: 'RM123456780GB', carrier: 'royal-mail', dispatched_at: daysAgo(118), created_at: daysAgo(120) },
        { order_type: 'refill',    box_number: 4,    amount_pence: 3800, status: 'paid', dispatch_status: 'delivered', tracking_number: 'RM234567801GB', carrier: 'royal-mail', dispatched_at: daysAgo(88),  created_at: daysAgo(90) },
        { order_type: 'refill',    box_number: 5,    amount_pence: 3800, status: 'paid', dispatch_status: 'delivered', tracking_number: 'RM345678012GB', carrier: 'royal-mail', dispatched_at: daysAgo(58),  created_at: daysAgo(60) },
        { order_type: 'refill',    box_number: 6,    amount_pence: 3800, status: 'paid', dispatch_status: 'delivered', tracking_number: 'RM456780123GB', carrier: 'royal-mail', dispatched_at: daysAgo(28),  created_at: daysAgo(30) },
        { order_type: 'refill',    box_number: 7,    amount_pence: 3800, status: 'paid', dispatch_status: 'pending',   tracking_number: null,            carrier: 'royal-mail', dispatched_at: null,          created_at: daysAgo(2) },
      ],
    },
  ]

  const orderIds: Record<string, string[]> = {}
  for (const group of orderGroups) {
    orderIds[group.scenario] = []
    for (const o of group.orders) {
      const { data } = await db
        .from('orders')
        .insert({
          customer_id: customerIds[group.scenario],
          subscription_id: subIds[group.scenario],
          stripe_payment_id: `pi_seed_${group.scenario}_${o.order_type}_${o.box_number ?? 0}`,
          kit_id: CUSTOMERS.find(c => c.scenario === group.scenario)!.kit_id,
          order_type: o.order_type,
          box_number: o.box_number,
          amount_pence: o.amount_pence,
          status: o.status,
          dispatch_status: o.dispatch_status,
          tracking_number: o.tracking_number,
          carrier: o.carrier,
          dispatched_at: o.dispatched_at,
          created_at: o.created_at,
        })
        .select('id')
        .single()
      if (data) orderIds[group.scenario].push(data.id)
    }
    console.log(`  ${group.scenario} → ${group.orders.length} orders`)
  }

  return orderIds
}

// ── Payment attempts ──────────────────────────────────────────────────────────

async function seedPaymentAttempts(
  customerIds: Record<string, string>,
  subIds: Record<string, string>,
) {
  console.log('Seeding payment attempts...')

  // active_good: 5 succeeded
  const jamesAttempts = [
    { inv: 'inv_seed_james_0', amount: 8500, status: 'succeeded', attempt: 1, at: daysAgo(120) },
    { inv: 'inv_seed_james_1', amount: 4800, status: 'succeeded', attempt: 1, at: daysAgo(90) },
    { inv: 'inv_seed_james_2', amount: 4800, status: 'succeeded', attempt: 1, at: daysAgo(60) },
    { inv: 'inv_seed_james_3', amount: 4800, status: 'succeeded', attempt: 1, at: daysAgo(30) },
  ]

  // past_due: 2 succeeded + 1 failed
  const marcusAttempts = [
    { inv: 'inv_seed_marcus_0', amount: 6500, status: 'succeeded',  attempt: 1, at: daysAgo(60), code: null },
    { inv: 'inv_seed_marcus_1', amount: 3800, status: 'succeeded',  attempt: 1, at: daysAgo(30), code: null },
    { inv: 'inv_seed_marcus_2', amount: 3800, status: 'failed',     attempt: 1, at: daysAgo(5),  code: 'insufficient_funds' },
  ]

  // unpaid: 1 succeeded (first box) + 4 failed refill
  const danielAttempts = [
    { inv: 'inv_seed_daniel_0', amount: 8500, status: 'succeeded', attempt: 1, at: daysAgo(35), code: null },
    { inv: 'inv_seed_daniel_1', amount: 4800, status: 'failed',    attempt: 1, at: daysAgo(14), code: 'card_declined' },
    { inv: 'inv_seed_daniel_1', amount: 4800, status: 'failed',    attempt: 2, at: daysAgo(11), code: 'card_declined' },
    { inv: 'inv_seed_daniel_1', amount: 4800, status: 'failed',    attempt: 3, at: daysAgo(7),  code: 'do_not_honor' },
    { inv: 'inv_seed_daniel_1', amount: 4800, status: 'failed',    attempt: 4, at: daysAgo(3),  code: 'do_not_honor' },
  ]

  // active_long: 8 succeeded
  const thomasAttempts = Array.from({ length: 8 }, (_, i) => ({
    inv: `inv_seed_thomas_${i}`,
    amount: i === 0 ? 6500 : 3800,
    status: 'succeeded',
    attempt: 1,
    at: daysAgo(210 - i * 30),
    code: null,
  }))

  const allGroups = [
    { scenario: 'active_good', attempts: jamesAttempts },
    { scenario: 'past_due',    attempts: marcusAttempts },
    { scenario: 'unpaid',      attempts: danielAttempts },
    { scenario: 'active_long', attempts: thomasAttempts },
  ]

  for (const group of allGroups) {
    for (const a of group.attempts) {
      await db.from('payment_attempts').insert({
        customer_id: customerIds[group.scenario],
        stripe_invoice_id: a.inv,
        amount_pence: a.amount,
        status: a.status,
        attempt_number: a.attempt,
        failure_code: (a as any).code ?? null,
        attempted_at: a.at,
      })
    }
    console.log(`  ${group.scenario} → ${group.attempts.length} payment attempts`)
  }
}

// ── Payment issues ────────────────────────────────────────────────────────────

async function seedPaymentIssues(customerIds: Record<string, string>) {
  console.log('Seeding payment issues...')

  await db.from('payment_issues').insert({
    customer_id: customerIds['unpaid'],
    stripe_invoice_id: 'inv_seed_daniel_1',
    issue_type: 'all_retries_failed',
    total_attempts: 4,
    last_failure_code: 'do_not_honor',
    resolved: false,
    created_at: daysAgo(3),
  })

  console.log('  1 unresolved payment issue (Daniel Ross — all retries failed)')
}

// ── Bookkeeping ───────────────────────────────────────────────────────────────

async function seedBookkeeping() {
  console.log('Seeding bookkeeping entries...')

  const entries = [
    { date: daysAgo(90).slice(0,10),  category: 'inventory',   description: 'Body Wash — 500 units (Cosmiko) [seed]',         amount_pence: 160000 },
    { date: daysAgo(90).slice(0,10),  category: 'inventory',   description: 'Atlas Clay — 100 units (Moroccan Organica) [seed]', amount_pence: 35000 },
    { date: daysAgo(90).slice(0,10),  category: 'inventory',   description: 'Argan Oil — 100 units [seed]',                    amount_pence: 55000 },
    { date: daysAgo(88).slice(0,10),  category: 'packaging',   description: 'SOLUM Boxes — 200 units (Alibaba) [seed]',        amount_pence: 24000 },
    { date: daysAgo(88).slice(0,10),  category: 'packaging',   description: 'Ritual First Box Fitments — 100 units [seed]',    amount_pence: 8500 },
    { date: daysAgo(88).slice(0,10),  category: 'packaging',   description: 'Ground Refill Fitments — 150 units [seed]',       amount_pence: 6000 },
    { date: daysAgo(60).slice(0,10),  category: 'marketing',   description: 'Meta Ads — March [seed]',                        amount_pence: 150000 },
    { date: daysAgo(30).slice(0,10),  category: 'marketing',   description: 'Meta Ads — April [seed]',                        amount_pence: 150000 },
    { date: daysAgo(85).slice(0,10),  category: 'compliance',  description: 'CPSR Assessment — products 01, 05, 06, 07 [seed]', amount_pence: 85000 },
    { date: daysAgo(100).slice(0,10), category: 'operations',  description: 'Royal Mail franking account setup [seed]',        amount_pence: 5000 },
    { date: daysAgo(45).slice(0,10),  category: 'inventory',   description: 'Body Lotion — 250 units (Cosmiko) [seed]',        amount_pence: 110000 },
    { date: daysAgo(14).slice(0,10),  category: 'marketing',   description: 'Instagram collab — @menswellness [seed]',         amount_pence: 50000 },
  ]

  await db.from('bookkeeping_entries').insert(entries)
  console.log(`  ${entries.length} bookkeeping entries`)
}

// ── Kit inventory ─────────────────────────────────────────────────────────────

async function setKitInventory() {
  console.log('Setting kit inventory...')
  await db.from('kit_inventory').upsert([
    { kit_id: 'ground',  available_count: 15, updated_at: now.toISOString() },
    { kit_id: 'ritual',  available_count: 8,  updated_at: now.toISOString() },
  ], { onConflict: 'kit_id' })
  console.log('  ground: 15 | ritual: 8')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 Seeding DEV admin test data...\n')
  await cleanSeedData()
  const customerIds = await seedCustomers()
  await seedAddresses(customerIds)
  const subIds = await seedSubscriptions(customerIds)
  await seedOrders(customerIds, subIds)
  await seedPaymentAttempts(customerIds, subIds)
  await seedPaymentIssues(customerIds)
  await seedBookkeeping()
  await setKitInventory()
  console.log('\n✅ Done. Open http://localhost:5174 to test.\n')
  console.log('Scenarios seeded:')
  console.log('  James Carter  (ritual)  — active, 4 months, all good')
  console.log('  Marcus Webb   (ground)  — past_due, 2 months, 1 failed payment')
  console.log('  Daniel Ross   (ritual)  — unpaid, 4 failures, open payment issue')
  console.log('  Thomas Blake  (ground)  — active, 7 months, long-term')
}

main().catch(err => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
