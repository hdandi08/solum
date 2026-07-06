# SOLUM Creator Program — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enter a creator in the admin and have the system automatically send a tracked 3-email outreach sequence (Day 0/3/7), record opens/clicks in our own DB, and auto-stop on engagement/unsubscribe/bounce — all on the existing Supabase + Resend + admin stack.

**Architecture:** Two new Supabase tables (`creators`, `creator_emails`). The admin app writes/reads them directly via its service-role client (existing pattern). One shared edge function `creator-outreach-run` is the only sender: it processes all *due* creators (used both for the instant Day-0 send, triggered by the admin after insert, and for the daily follow-ups, triggered by pg_cron). `resend-webhook` records tracking events; `creator-unsubscribe` handles opt-outs. Pure scheduling logic lives in a dependency-free `.mjs` module tested with `node --test`.

**Tech Stack:** Supabase Postgres + edge functions (Deno), Resend (send + open/click tracking + Svix-signed webhook), pg_cron/pg_net (daily schedule), React (admin `admin/` app, Vite), node:test for pure-logic unit tests.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-06-creator-program-design.md`.
- Work on the `dev` branch. Commit per task.
- **Dev + prod parity:** every migration and function deploy goes to BOTH dev (`rodvvmfzkyjsqbufkjbc`) and prod (`gvfptmjluxpngfjendbi`) in the same session.
- **Ask before deploying edge functions / applying prod migrations** — the plan's deploy steps are gated on explicit user go-ahead.
- Email copy rules: NO em/en/double dashes — use `·` or commas. Min font sizes 13px body, 11px labels. Palette: SOLUM Black `#08090B`, Bone `#F0ECE2`, Steel Blue `#2E6DA4`, Sky `#4A8FC7`. Logo via hosted `https://bysolum.co.uk/email/solum-logo.png` img, never retyped.
- **Outreach sender:** `SOLUM Creators <hello@creators.bysolum.com>`, `reply_to: contact@bysolum.com`. Never the transactional `orders.bysolum.co.uk` sender.
- Sequence: step 1 = Day 0 (on entry), step 2 = created_at + 3 days, step 3 = created_at + 7 days. Fully automatic. Auto-stop when `stage` ∈ {in_talks, active, declined, archived}, or `unsubscribed`, or `sequence_status != 'active'`.
- Every email includes `List-Unsubscribe` one-click + a visible unsubscribe link to `creator-unsubscribe`.

---

### Task 1: Database migration — `creators` + `creator_emails`

**Files:**
- Create: `supabase/migrations/20260706000000_create_creators.sql`

**Interfaces:**
- Produces: tables `public.creators`, `public.creator_emails` with the columns other tasks read/write (see below). RLS enabled with no policies (service-role only; anon denied).

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260706000000_create_creators.sql`:
```sql
-- SOLUM Creator Program — CRM record + outreach tracking log.
create table if not exists public.creators (
  id                 uuid        primary key default gen_random_uuid(),
  name               text,
  email              text        not null,
  instagram_handle   text,
  tiktok_handle      text,
  niches             text[]      not null default '{}',
  follower_count     integer,
  location           text,
  deal_types         text[]      not null default '{}',
  portfolio_url      text,
  aesthetic_score    integer,
  stage              text        not null default 'contacted',
  source             text        not null default 'manual',
  sequence_status    text        not null default 'active',
  sequence_step      integer     not null default 0,
  next_email_at      timestamptz,
  unsubscribed       boolean     not null default false,
  unsubscribe_token  uuid        not null default gen_random_uuid(),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- One creator per email (prevents double-enrolment). Case-insensitive.
create unique index if not exists creators_email_lower_idx on public.creators (lower(email));
create index if not exists creators_stage_idx        on public.creators (stage);
create index if not exists creators_sequence_due_idx  on public.creators (sequence_status, next_email_at);
create index if not exists creators_unsub_token_idx   on public.creators (unsubscribe_token);

create table if not exists public.creator_emails (
  id            uuid        primary key default gen_random_uuid(),
  creator_id    uuid        not null references public.creators(id) on delete cascade,
  step          integer     not null,
  template_key  text        not null,
  subject       text        not null,
  resend_id     text,
  sent_at       timestamptz,
  delivered_at  timestamptz,
  opened_at     timestamptz,
  clicked_at    timestamptz,
  bounced_at    timestamptz,
  open_count    integer     not null default 0,
  click_count   integer     not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists creator_emails_creator_idx on public.creator_emails (creator_id);
create index if not exists creator_emails_resend_idx   on public.creator_emails (resend_id);

-- PII: enable RLS with no policies so only the service role reaches these rows.
alter table public.creators       enable row level security;
alter table public.creator_emails enable row level security;
```

- [ ] **Step 2: Apply to dev and verify**

Run:
```bash
supabase db push --db-url "$SUPABASE_DB_URL_DEV"   # or: supabase migration up --linked (dev linked)
```
If the CLI is not linked, apply via the SQL editor / psql against dev. Expected: no errors.
Verify:
```bash
psql "$SUPABASE_DB_URL_DEV" -c "\d public.creators" -c "\d public.creator_emails"
```
Expected: both tables exist with the columns above; `creators_email_lower_idx` unique index present.

- [ ] **Step 3: Commit** (prod apply happens in Task 8, gated on go-ahead)

```bash
git add supabase/migrations/20260706000000_create_creators.sql
git commit -m "feat(creators): creators + creator_emails tables (RLS service-role only)"
```

---

### Task 2: Pure sequence logic + unit tests

**Files:**
- Create: `supabase/functions/_shared/sequence.mjs`
- Test: `supabase/functions/_shared/sequence.test.mjs`

**Interfaces:**
- Produces (imported by Task 4's function; Deno imports `.mjs` natively):
  - `SEQUENCE` — `[{step:1,key:'intro',offsetDays:0},{step:2,key:'follow_up',offsetDays:3},{step:3,key:'final',offsetDays:7}]`
  - `dueStep(creator, now: Date): {step:number, key:string} | null` — the next email to send, or null if not due / stopped / done.
  - `computeAfterSend(sentStep: number, createdAt: Date): {sequence_status:string, next_email_at: string|null}` — the row update after a successful send.

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/_shared/sequence.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEQUENCE, dueStep, computeAfterSend } from './sequence.mjs';

const base = (over = {}) => ({
  sequence_status: 'active', sequence_step: 0, unsubscribed: false,
  stage: 'contacted', next_email_at: null, created_at: '2026-07-06T09:00:00Z', ...over,
});

test('SEQUENCE has 3 steps at day 0/3/7', () => {
  assert.deepEqual(SEQUENCE.map(s => s.offsetDays), [0, 3, 7]);
});

test('step 0 with no next_email_at is due for intro', () => {
  assert.deepEqual(dueStep(base(), new Date('2026-07-06T09:00:00Z')), { step: 1, key: 'intro' });
});

test('not due when next_email_at is in the future', () => {
  const c = base({ sequence_step: 1, next_email_at: '2026-07-09T09:00:00Z' });
  assert.equal(dueStep(c, new Date('2026-07-07T09:00:00Z')), null);
});

test('due for follow_up once next_email_at has passed', () => {
  const c = base({ sequence_step: 1, next_email_at: '2026-07-09T09:00:00Z' });
  assert.deepEqual(dueStep(c, new Date('2026-07-09T10:00:00Z')), { step: 2, key: 'follow_up' });
});

test('stopped when stage is terminal', () => {
  assert.equal(dueStep(base({ stage: 'in_talks' }), new Date('2026-07-06T09:00:00Z')), null);
});

test('stopped when unsubscribed or not active', () => {
  assert.equal(dueStep(base({ unsubscribed: true }), new Date()), null);
  assert.equal(dueStep(base({ sequence_status: 'stopped' }), new Date()), null);
});

test('nothing left after step 3', () => {
  assert.equal(dueStep(base({ sequence_step: 3 }), new Date('2027-01-01')), null);
});

test('computeAfterSend schedules step 2 at +3 days', () => {
  const r = computeAfterSend(1, new Date('2026-07-06T09:00:00Z'));
  assert.equal(r.sequence_status, 'active');
  assert.equal(r.next_email_at, new Date('2026-07-09T09:00:00Z').toISOString());
});

test('computeAfterSend schedules step 3 at +7 days', () => {
  const r = computeAfterSend(2, new Date('2026-07-06T09:00:00Z'));
  assert.equal(r.next_email_at, new Date('2026-07-13T09:00:00Z').toISOString());
});

test('computeAfterSend completes after step 3', () => {
  assert.deepEqual(computeAfterSend(3, new Date('2026-07-06T09:00:00Z')),
    { sequence_status: 'completed', next_email_at: null });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test supabase/functions/_shared/sequence.test.mjs`
Expected: FAIL — cannot find module `./sequence.mjs`.

- [ ] **Step 3: Write the implementation**

Create `supabase/functions/_shared/sequence.mjs`:
```js
// Pure, dependency-free outreach-sequence logic. Imported by the edge function
// (Deno supports .mjs) and unit-tested with node --test.
export const SEQUENCE = [
  { step: 1, key: 'intro',     offsetDays: 0 },
  { step: 2, key: 'follow_up', offsetDays: 3 },
  { step: 3, key: 'final',     offsetDays: 7 },
];

const TERMINAL_STAGES = new Set(['in_talks', 'active', 'declined', 'archived']);
const DAY_MS = 86400000;

// The next email to send for this creator right now, or null if not due/stopped/done.
export function dueStep(creator, now = new Date()) {
  if (creator.sequence_status !== 'active') return null;
  if (creator.unsubscribed) return null;
  if (TERMINAL_STAGES.has(creator.stage)) return null;
  const nextStep = (creator.sequence_step ?? 0) + 1;
  if (nextStep > SEQUENCE.length) return null;
  if (creator.next_email_at && new Date(creator.next_email_at) > now) return null;
  const s = SEQUENCE[nextStep - 1];
  return { step: s.step, key: s.key };
}

// Row update to apply after step `sentStep` was successfully sent.
export function computeAfterSend(sentStep, createdAt) {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const next = SEQUENCE[sentStep]; // SEQUENCE[sentStep] is the step AFTER sentStep (0-indexed)
  if (!next) return { sequence_status: 'completed', next_email_at: null };
  return {
    sequence_status: 'active',
    next_email_at: new Date(created.getTime() + next.offsetDays * DAY_MS).toISOString(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test supabase/functions/_shared/sequence.test.mjs`
Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/sequence.mjs supabase/functions/_shared/sequence.test.mjs
git commit -m "feat(creators): pure outreach-sequence scheduling logic + tests"
```

---

### Task 3: Shared creator email templates

**Files:**
- Create: `supabase/functions/_shared/creatorEmails.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `buildCreatorEmail(key: 'intro'|'follow_up'|'final', creator: {name?:string|null, unsubscribe_token:string}): {subject: string, html: string}`

- [ ] **Step 1: Write the implementation**

Create `supabase/functions/_shared/creatorEmails.ts`:
```ts
// Dark-theme outreach templates for the creator sequence. Copy rules: no em/en
// dashes; · or commas only. Unsubscribe link required. Logo via hosted PNG.
const LOGO = 'https://bysolum.co.uk/email/solum-logo.png'
const UNSUB_BASE = 'https://gvfptmjluxpngfjendbi.supabase.co/functions/v1/creator-unsubscribe'
const APPLY_URL = 'https://bysolum.co.uk/?utm_source=email&utm_medium=email&utm_campaign=creator_outreach'

type Key = 'intro' | 'follow_up' | 'final'

const COPY: Record<Key, { subject: string; heading: string; body: string[] }> = {
  intro: {
    subject: 'SOLUM · creator collab',
    heading: 'We think you would be a great fit for SOLUM.',
    body: [
      'SOLUM is a men’s body care ritual, head to toe, built for guys who want to be done right. Your content is exactly the tone we are building around, premium, real, no fluff.',
      'We are bringing on a small group of creators for paid UGC, affiliate, and partnership collabs. Reply to this email if you want in and we will send the details.',
    ],
  },
  follow_up: {
    subject: 'SOLUM · quick follow up',
    heading: 'Still keen to work with you.',
    body: [
      'Circling back on the SOLUM creator collab. We shoot dark, premium, cinematic, and your style matches it. Kits are going out to our first creators now.',
      'If it is a fit, just reply and we will sort the details, gifting, UGC rates, or affiliate, whatever suits you.',
    ],
  },
  final: {
    subject: 'SOLUM · last note',
    heading: 'Last one from us.',
    body: [
      'We will leave it here so we are not filling your inbox. The SOLUM creator collab is open if you want it, paid UGC, affiliate, or partnership.',
      'If now is not the time, no worries at all. Reply any time and we will pick it back up.',
    ],
  },
}

export function buildCreatorEmail(key: Key, creator: { name?: string | null; unsubscribe_token: string }) {
  const c = COPY[key]
  const greeting = creator.name ? `${creator.name},` : 'Hey,'
  const unsub = `${UNSUB_BASE}?token=${creator.unsubscribe_token}`
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${c.subject}</title><style>body,#bg{background-color:#08090B !important;}</style></head>
<body bgcolor="#08090B" style="margin:0;padding:0;background-color:#08090B;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table id="bg" width="100%" cellpadding="0" cellspacing="0" bgcolor="#08090B" style="background-color:#08090B;border-collapse:collapse;">
<tr><td align="center" style="padding:0;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-collapse:collapse;background-color:#08090B;">
  <tr><td style="padding:28px 36px 22px;">
    <img src="${LOGO}" alt="SOLUM" width="118" style="display:block;border:0;height:auto;" />
    <p style="margin:9px 0 0;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:600;">Creator collabs</p>
  </td></tr>
  <tr><td style="padding:6px 36px 8px;">
    <p style="margin:0 0 18px;font-size:22px;font-weight:700;color:#F0ECE2;line-height:1.3;">${greeting} ${c.heading}</p>
    ${c.body.map(p => `<p style="margin:0 0 16px;font-size:15px;color:rgba(240,236,226,0.75);line-height:1.75;">${p}</p>`).join('')}
    <table cellpadding="0" cellspacing="0" style="margin:14px 0 6px;"><tr><td bgcolor="#F0ECE2" style="background:#F0ECE2;">
      <a href="${APPLY_URL}" style="display:inline-block;background:#F0ECE2;color:#08090B;font-size:13px;letter-spacing:4px;text-transform:uppercase;font-weight:700;padding:16px 40px;text-decoration:none;">See SOLUM &rarr;</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:22px 36px 30px;">
    <p style="margin:0;font-size:14px;color:rgba(240,236,226,0.6);line-height:1.6;">Harsha<br/><span style="font-size:12px;color:rgba(240,236,226,0.3);">Founder, SOLUM</span></p>
  </td></tr>
  <tr><td bgcolor="#0c0e12" style="background:#0c0e12;border-top:1px solid #181c24;padding:18px 36px 22px;">
    <p style="margin:0 0 6px;font-size:11px;color:rgba(240,236,226,0.25);line-height:1.6;">You received this because we thought you would be a fit for SOLUM. Not interested? <a href="${unsub}" style="color:#4A8FC7;text-decoration:none;">Unsubscribe</a>.</p>
    <p style="margin:0;font-size:10px;color:rgba(240,236,226,0.15);letter-spacing:1px;">SOLUM · bysolum.co.uk</p>
  </td></tr>
</table></td></tr></table></body></html>`
  return { subject: c.subject, html }
}
```

- [ ] **Step 2: Sanity-check no forbidden dashes**

Run: `grep -nE "—|–|--" supabase/functions/_shared/creatorEmails.ts | grep -v "https" || echo "clean"`
Expected: `clean` (copy uses `·`/commas; the only `--` would be in a URL, excluded).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/creatorEmails.ts
git commit -m "feat(creators): 3-step outreach email templates"
```

---

### Task 4: `creator-outreach-run` edge function (the sender)

**Files:**
- Create: `supabase/functions/creator-outreach-run/index.ts`

**Interfaces:**
- Consumes: `dueStep`, `computeAfterSend` from `../_shared/sequence.mjs`; `buildCreatorEmail` from `../_shared/creatorEmails.ts`.
- Produces: HTTP endpoint. POST (any/empty body) → processes all due creators. Returns `{ processed, sent, failed, errors }`. Invoked both by the admin (after insert, for the instant Day-0 send) and by pg_cron (daily).

- [ ] **Step 1: Write the implementation**

Create `supabase/functions/creator-outreach-run/index.ts`:
```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { dueStep, computeAfterSend } from '../_shared/sequence.mjs'
import { buildCreatorEmail } from '../_shared/creatorEmails.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const FROM = 'SOLUM Creators <hello@creators.bysolum.com>'
const REPLY_TO = 'contact@bysolum.com'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500 })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const now = new Date()

  const { data: creators, error } = await supabase
    .from('creators')
    .select('*')
    .eq('sequence_status', 'active')
    .eq('unsubscribed', false)
    .not('stage', 'in', '(in_talks,active,declined,archived)')
    .or(`next_email_at.is.null,next_email_at.lte.${now.toISOString()}`)
    .order('created_at', { ascending: true })
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors })

  const res = { processed: 0, sent: 0, failed: 0, errors: [] as string[] }
  for (const c of creators ?? []) {
    const due = dueStep(c, now)
    if (!due) continue
    res.processed++
    const { subject, html } = buildCreatorEmail(due.key as any, { name: c.name, unsubscribe_token: c.unsubscribe_token })
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM, reply_to: REPLY_TO, to: [c.email], subject, html,
          headers: {
            'List-Unsubscribe': `<https://gvfptmjluxpngfjendbi.supabase.co/functions/v1/creator-unsubscribe?token=${c.unsubscribe_token}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      })
      if (!r.ok) { res.failed++; res.errors.push(`${c.email}: ${await r.text()}`); continue }
      const body = await r.json().catch(() => ({}))
      // Log the send, then advance the creator (only after a successful send).
      await supabase.from('creator_emails').insert({
        creator_id: c.id, step: due.step, template_key: due.key, subject,
        resend_id: body.id ?? null, sent_at: now.toISOString(),
      })
      const after = computeAfterSend(due.step, c.created_at)
      await supabase.from('creators').update({
        sequence_step: due.step, ...after, updated_at: now.toISOString(),
      }).eq('id', c.id)
      res.sent++
    } catch (e) {
      res.failed++; res.errors.push(`${c.email}: ${e}`)
    }
    await sleep(4000)
  }
  return new Response(JSON.stringify(res), { headers: { ...cors, 'Content-Type': 'application/json' } })
})
```

- [ ] **Step 2: Deploy to dev and smoke-test** (gated: confirm with user before deploy)

Run:
```bash
supabase functions deploy creator-outreach-run --project-ref rodvvmfzkyjsqbufkjbc --no-verify-jwt
```
Insert a test creator with a controlled address via the SQL editor (dev), `next_email_at = now()`, then:
```bash
curl -s -X POST "https://rodvvmfzkyjsqbufkjbc.supabase.co/functions/v1/creator-outreach-run" -H "apikey: <DEV_ANON_KEY>" -H "Content-Type: application/json" -d '{}'
```
Expected: `{"processed":1,"sent":1,...}`; the test address receives the intro email; a `creator_emails` row exists with a `resend_id`; the creator row now has `sequence_step=1` and `next_email_at = created_at + 3 days`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/creator-outreach-run/index.ts
git commit -m "feat(creators): creator-outreach-run sender (instant day-0 + daily follow-ups)"
```

---

### Task 5: `resend-webhook` edge function (open/click/bounce tracking)

**Files:**
- Create: `supabase/functions/resend-webhook/index.ts`

**Interfaces:**
- Consumes: Resend Svix-signed webhook POSTs.
- Produces: updates `creator_emails` (delivered/opened/clicked/bounced + counts) matched by `resend_id`; on bounce/complaint sets the creator `unsubscribed=true`, `sequence_status='stopped'`.

- [ ] **Step 1: Write the implementation**

Create `supabase/functions/resend-webhook/index.ts`:
```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Verify a Svix-signed webhook (Resend uses Svix). Secret form: "whsec_<base64>".
async function verify(secret: string, id: string, ts: string, payload: string, header: string) {
  const key = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), c => c.charCodeAt(0))
  const mac = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', mac, new TextEncoder().encode(`${id}.${ts}.${payload}`))
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
  // header is space-separated "v1,<sig>" entries
  return header.split(' ').some(part => part.split(',')[1] === expected)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 })
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET')
  if (!secret) return new Response('no secret', { status: 500 })

  const payload = await req.text()
  const id = req.headers.get('svix-id') ?? ''
  const ts = req.headers.get('svix-timestamp') ?? ''
  const sigHeader = req.headers.get('svix-signature') ?? ''
  if (!(await verify(secret, id, ts, payload, sigHeader))) return new Response('bad signature', { status: 401 })

  const evt = JSON.parse(payload)
  const type: string = evt.type ?? ''
  const emailId: string | undefined = evt.data?.email_id ?? evt.data?.id
  if (!emailId) return new Response('ok', { status: 200 })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const nowIso = new Date().toISOString()

  const { data: rows } = await supabase.from('creator_emails').select('*').eq('resend_id', emailId).limit(1)
  const row = rows?.[0]
  if (!row) return new Response('ok', { status: 200 })

  const patch: Record<string, unknown> = {}
  if (type === 'email.delivered') patch.delivered_at = row.delivered_at ?? nowIso
  if (type === 'email.opened')  { patch.opened_at = row.opened_at ?? nowIso; patch.open_count = (row.open_count ?? 0) + 1 }
  if (type === 'email.clicked') { patch.clicked_at = row.clicked_at ?? nowIso; patch.click_count = (row.click_count ?? 0) + 1 }
  if (type === 'email.bounced' || type === 'email.complained') patch.bounced_at = row.bounced_at ?? nowIso
  if (Object.keys(patch).length) await supabase.from('creator_emails').update(patch).eq('id', row.id)

  if (type === 'email.bounced' || type === 'email.complained') {
    await supabase.from('creators').update({ unsubscribed: true, sequence_status: 'stopped', updated_at: nowIso }).eq('id', row.creator_id)
  }
  return new Response('ok', { status: 200 })
})
```

- [ ] **Step 2: Deploy to dev** (gated: confirm before deploy)

Run:
```bash
supabase functions deploy resend-webhook --project-ref rodvvmfzkyjsqbufkjbc --no-verify-jwt
```
Expected: deploys. (Full verification happens in Task 8 after the Resend webhook is configured; a mismatched signature returns 401, which is correct.)

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/resend-webhook/index.ts
git commit -m "feat(creators): resend-webhook records open/click/bounce, stops on bounce"
```

---

### Task 6: `creator-unsubscribe` edge function

**Files:**
- Create: `supabase/functions/creator-unsubscribe/index.ts`

**Interfaces:**
- Consumes: `GET ?token=<uuid>` (also handles POST for one-click List-Unsubscribe).
- Produces: sets `unsubscribed=true`, `sequence_status='stopped'` for the matching creator; returns a small confirmation HTML page.

- [ ] **Step 1: Write the implementation**

Create `supabase/functions/creator-unsubscribe/index.ts`:
```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const page = (msg: string) =>
    new Response(`<!doctype html><meta charset="utf-8"><body style="background:#08090B;color:#F0ECE2;font-family:Helvetica,Arial,sans-serif;text-align:center;padding:60px 24px;"><p style="font-size:16px;">${msg}</p><p style="font-size:12px;color:#4A8FC7;letter-spacing:2px;">SOLUM</p></body>`,
      { headers: { 'Content-Type': 'text/html' } })

  if (!token) return page('Invalid unsubscribe link.')
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data } = await supabase.from('creators').select('id').eq('unsubscribe_token', token).limit(1)
  if (!data?.[0]) return page('This link is no longer valid.')
  await supabase.from('creators').update({ unsubscribed: true, sequence_status: 'stopped', updated_at: new Date().toISOString() }).eq('id', data[0].id)
  return page('You are unsubscribed. You will not receive further emails from SOLUM creators.')
})
```

- [ ] **Step 2: Deploy to dev + verify** (gated: confirm before deploy)

Run:
```bash
supabase functions deploy creator-unsubscribe --project-ref rodvvmfzkyjsqbufkjbc --no-verify-jwt
curl -s "https://rodvvmfzkyjsqbufkjbc.supabase.co/functions/v1/creator-unsubscribe?token=<test_creator_token>" | head -c 120
```
Expected: confirmation HTML; the test creator row now has `unsubscribed=true`, `sequence_status='stopped'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/creator-unsubscribe/index.ts
git commit -m "feat(creators): creator-unsubscribe endpoint (one-click, stops sequence)"
```

---

### Task 7: Admin `CreatorsPage` — entry, pipeline, drill-down

**Files:**
- Create: `admin/src/pages/CreatorsPage.jsx`
- Modify: `admin/src/App.jsx` (add `/creators` route)
- Modify: `admin/src/components/Layout.jsx` (add nav link — confirm actual nav file; grep in Step 1)

**Interfaces:**
- Consumes: `useEnv()` → `config.client` (service-role Supabase client) and `config.url` + `config.anonKey`; tables from Task 1; the `creator-outreach-run` function from Task 4.
- Produces: the CRM UI. Adding a creator inserts a row then calls `creator-outreach-run` so the Day-0 email fires immediately.

- [ ] **Step 1: Find the nav component**

Run: `grep -rln "orders\|Orders" admin/src/components admin/src/App.jsx | head` and open the file that renders the nav links (e.g. `Layout.jsx` / `Sidebar.jsx`). Note its exact path and the existing `<NavLink to="orders">` pattern; you will mirror it for `creators`.

- [ ] **Step 2: Create the page**

Create `admin/src/pages/CreatorsPage.jsx`:
```jsx
import { useState, useEffect, useCallback } from 'react'
import { useEnv } from '../context/EnvContext'

const STAGES = ['candidate', 'applied', 'vetting', 'contacted', 'in_talks', 'active', 'declined', 'archived']
const NICHES = ['grooming', 'fitness', 'everyday', 'lifestyle']
const DEALS = ['ugc', 'affiliate', 'paid']
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'

const EMPTY = { name: '', email: '', instagram_handle: '', tiktok_handle: '', niches: [], deal_types: [], follower_count: '', location: '', portfolio_url: '', aesthetic_score: '', notes: '' }

export default function CreatorsPage() {
  const { config } = useEnv()
  const [rows, setRows] = useState([])
  const [emails, setEmails] = useState({})   // creator_id -> [creator_emails]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [openId, setOpenId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data, error } = await config.client.from('creators').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setRows(data || [])
      const { data: em } = await config.client.from('creator_emails').select('*').order('sent_at', { ascending: true })
      const by = {}; for (const e of em || []) (by[e.creator_id] ||= []).push(e); setEmails(by)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [config])

  useEffect(() => { load() }, [load])

  const toggle = (field, val) => setForm(f => ({ ...f, [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val] }))

  async function addCreator(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        email: form.email.trim(),
        follower_count: form.follower_count ? Number(form.follower_count) : null,
        aesthetic_score: form.aesthetic_score ? Number(form.aesthetic_score) : null,
        stage: 'contacted', source: 'manual', sequence_status: 'active', sequence_step: 0,
        next_email_at: new Date().toISOString(),
      }
      const { error } = await config.client.from('creators').insert(payload)
      if (error) throw error
      // Fire the Day-0 email immediately (same function the daily cron uses).
      await fetch(`${config.url}/functions/v1/creator-outreach-run`, {
        method: 'POST', headers: { 'apikey': config.anonKey, 'Content-Type': 'application/json' }, body: '{}',
      })
      setForm(EMPTY); await load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  async function setStage(id, stage) {
    const patch = { stage, updated_at: new Date().toISOString() }
    if (['in_talks', 'active', 'declined', 'archived'].includes(stage)) patch.sequence_status = 'stopped'
    await config.client.from('creators').update(patch).eq('id', id)
    await load()
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Creators</h1>
      {error && <p style={{ color: '#e57373' }}>{error}</p>}

      <form onSubmit={addCreator} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24, maxWidth: 900 }}>
        <input required placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <input placeholder="Instagram @" value={form.instagram_handle} onChange={e => setForm(f => ({ ...f, instagram_handle: e.target.value }))} />
        <input placeholder="TikTok @" value={form.tiktok_handle} onChange={e => setForm(f => ({ ...f, tiktok_handle: e.target.value }))} />
        <input placeholder="Followers" value={form.follower_count} onChange={e => setForm(f => ({ ...f, follower_count: e.target.value }))} />
        <input placeholder="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
        <input placeholder="Portfolio URL" value={form.portfolio_url} onChange={e => setForm(f => ({ ...f, portfolio_url: e.target.value }))} />
        <input placeholder="Aesthetic 1-5" value={form.aesthetic_score} onChange={e => setForm(f => ({ ...f, aesthetic_score: e.target.value }))} />
        <div style={{ gridColumn: '1 / -1', fontSize: 12 }}>Niches: {NICHES.map(n => <label key={n} style={{ marginRight: 10 }}><input type="checkbox" checked={form.niches.includes(n)} onChange={() => toggle('niches', n)} /> {n}</label>)}</div>
        <div style={{ gridColumn: '1 / -1', fontSize: 12 }}>Deals: {DEALS.map(d => <label key={d} style={{ marginRight: 10 }}><input type="checkbox" checked={form.deal_types.includes(d)} onChange={() => toggle('deal_types', d)} /> {d}</label>)}</div>
        <textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ gridColumn: '1 / -1' }} />
        <button disabled={saving} type="submit" style={{ gridColumn: '1 / -1', padding: '10px' }}>{saving ? 'Adding + sending intro…' : 'Add creator (sends intro now)'}</button>
      </form>

      {loading ? <p>Loading…</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr><th align="left">Email</th><th align="left">Handles</th><th align="left">Stage</th><th align="left">Sequence</th><th align="left">Last email</th></tr></thead>
          <tbody>
            {rows.map(c => {
              const em = emails[c.id] || []
              const last = em[em.length - 1]
              return (
                <>
                  <tr key={c.id} style={{ borderTop: '1px solid #222', cursor: 'pointer' }} onClick={() => setOpenId(openId === c.id ? null : c.id)}>
                    <td>{c.email}{c.unsubscribed && <span style={{ color: '#e57373' }}> · unsub</span>}</td>
                    <td>{c.instagram_handle || ''} {c.tiktok_handle || ''}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <select value={c.stage} onChange={e => setStage(c.id, e.target.value)}>{STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </td>
                    <td>{c.sequence_status} · {c.sequence_step}/3</td>
                    <td>{last ? `${last.template_key} ${fmt(last.sent_at)}${last.opened_at ? ' · opened' : ''}${last.clicked_at ? ' · clicked' : ''}` : '—'}</td>
                  </tr>
                  {openId === c.id && (
                    <tr><td colSpan={5} style={{ background: '#101216', padding: 12 }}>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>Niches: {c.niches?.join(', ') || '—'} · Deals: {c.deal_types?.join(', ') || '—'} · Followers: {c.follower_count ?? '—'} · Aesthetic: {c.aesthetic_score ?? '—'} · {c.location || '—'}</div>
                      {c.portfolio_url && <div style={{ fontSize: 12 }}><a href={c.portfolio_url} target="_blank" rel="noreferrer" style={{ color: '#4A8FC7' }}>{c.portfolio_url}</a></div>}
                      {c.notes && <div style={{ fontSize: 12, marginTop: 4 }}>{c.notes}</div>}
                      <div style={{ marginTop: 8, fontSize: 12 }}>
                        {em.length === 0 ? 'No emails sent yet.' : em.map(e => (
                          <div key={e.id}>{e.step}. {e.template_key} · sent {fmt(e.sent_at)}{e.delivered_at ? ' · delivered' : ''}{e.opened_at ? ` · opened ${e.open_count}x` : ''}{e.clicked_at ? ` · clicked ${e.click_count}x` : ''}{e.bounced_at ? ' · bounced' : ''}</div>
                        ))}
                      </div>
                    </td></tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire the route + nav**

In `admin/src/App.jsx`, add the import and route (mirror the `orders` route):
```jsx
import CreatorsPage from './pages/CreatorsPage'
// inside <Route path="/" element={<Layout .../>}>:
<Route path="creators" element={<CreatorsPage />} />
```
In the nav component found in Step 1, add a link mirroring the existing ones:
```jsx
<NavLink to="/creators">Creators</NavLink>
```

- [ ] **Step 4: Build + manual check**

Run: `cd admin && npm run build`
Expected: build succeeds. Then `npm run dev`, open the admin, switch to DEV env, go to Creators, add a creator with a controlled email → row appears, `sequence 1/3` within a moment, the test address receives the intro, and the drill-down shows the send. (Requires Task 4 deployed to dev.)

- [ ] **Step 5: Commit**

```bash
git add admin/src/pages/CreatorsPage.jsx admin/src/App.jsx admin/src/components/
git commit -m "feat(admin): Creators CRM page (entry, pipeline, tracked email history)"
```

---

### Task 8: Deploy, wire cron + Resend, prod parity (ops)

**Files:** none (infrastructure). All actions gated on explicit user go-ahead.

- [ ] **Step 1: Resend sending domain (needs Harsha / DNS)**

In Resend, add domain `creators.bysolum.com`; add the SPF/DKIM/DMARC DNS records it shows to the `bysolum.com` DNS. Enable **Open tracking** and **Click tracking** for this domain. Wait for "Verified".

- [ ] **Step 2: Resend webhook + secret**

In Resend → Webhooks, add an endpoint to the prod function URL `https://gvfptmjluxpngfjendbi.supabase.co/functions/v1/resend-webhook` subscribed to `email.delivered, email.opened, email.clicked, email.bounced, email.complained`. Copy its signing secret. Set it on both projects:
```bash
supabase secrets set RESEND_WEBHOOK_SECRET="whsec_..." --project-ref gvfptmjluxpngfjendbi
supabase secrets set RESEND_WEBHOOK_SECRET="whsec_..." --project-ref rodvvmfzkyjsqbufkjbc
```
(Optionally add a second dev webhook endpoint to the dev function URL for dev testing.)

- [ ] **Step 2b: Confirm RESEND_API_KEY exists on both** (used by the sender)

Run: `supabase secrets list --project-ref gvfptmjluxpngfjendbi | grep RESEND_API_KEY` and same for dev. If missing on dev, set it.

- [ ] **Step 3: Apply migration to prod**

```bash
supabase db push --db-url "$SUPABASE_DB_URL_PROD"   # or run the migration SQL against prod
psql "$SUPABASE_DB_URL_PROD" -c "\d public.creators"
```
Expected: tables exist on prod.

- [ ] **Step 4: Deploy all functions to prod (and dev if not already)**

```bash
for fn in creator-outreach-run resend-webhook creator-unsubscribe; do
  supabase functions deploy $fn --project-ref gvfptmjluxpngfjendbi --no-verify-jwt
  supabase functions deploy $fn --project-ref rodvvmfzkyjsqbufkjbc --no-verify-jwt
done
```
Expected: all deploy on both projects.

- [ ] **Step 5: Schedule the daily cron (pg_cron + pg_net) on both projects**

In the SQL editor of each project:
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
  'creator-outreach-daily', '0 9 * * *',   -- 09:00 UTC daily
  $$ select net.http_post(
       url := 'https://PROJECT_REF.supabase.co/functions/v1/creator-outreach-run',
       headers := '{"Content-Type":"application/json","apikey":"<ANON_KEY>"}'::jsonb,
       body := '{}'::jsonb) $$
);
```
Replace `PROJECT_REF` and `<ANON_KEY>` per project. Verify: `select * from cron.job;`

- [ ] **Step 6: End-to-end verify on prod**

Add a creator (controlled address) via the admin against PROD → intro arrives → open it → within a minute the admin drill-down shows `opened`. Move stage to `in_talks` → confirm `sequence_status='stopped'` (no further emails). Click the unsubscribe link on a second test creator → confirm `unsubscribed=true`.

- [ ] **Step 7: Log the prod changes**

Append a row to `docs/manual-changes-log.md` (date, functions + migration deployed to dev+prod, cron scheduled, Resend domain+webhook configured), then commit.

```bash
git add docs/manual-changes-log.md
git commit -m "docs: log creator-program deploy (migration + functions + cron + resend)"
```

---

## Self-review notes

- **Spec coverage:** data model (T1), 3-email sequence + timing (T2/T3), auto-send on entry (T7 → T4), daily follow-ups (T8 cron → T4), open/click tracking (T5), auto-stop on stage/unsub/bounce (T4 filter + T5 + T6 + T7 stage change), separate sender + unsubscribe (T3/T4/T6/T8), admin CRM (T7), dev+prod parity (T8). All covered.
- **Deferred (later phases, not in this plan):** public `/creators` application page (Phase 2); discovery vetting queue + paid API (Phase 3); inbound reply parsing; affiliate code issuance.
