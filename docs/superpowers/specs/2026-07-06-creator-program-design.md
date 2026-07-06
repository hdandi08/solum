# SOLUM Creator Program — Design (Phase 1)

> Status: approved in brainstorm 2026-07-06. This spec covers **Phase 1** of a
> decomposed project. Phases 2 and 3 are scoped at the bottom and get their own
> spec → plan → build cycles.

## Goal

Recruit and manage UGC creators for SOLUM with **near-zero manual work**: you enter a
creator (or later, they apply), and the system automatically enrols them, sends a tracked
3-email outreach sequence over a week, records opens/clicks, and surfaces everything in a
CRM. Immediate target: **5–8 active creators**, on a list that grows over time.

Success = (a) adding a creator triggers the sequence with no further clicks; (b) every
send is tracked (delivered / opened / clicked) in our own DB; (c) sequences auto-stop when
a creator engages, unsubscribes, or bounces; (d) all owned and self-hosted on the existing
stack; (e) transactional (order) email deliverability is not put at risk.

## Who we recruit (fit definition)

- **Niches:** men's grooming / skincare, fitness / gym / athletes, everyday relatable men.
- **Aesthetic bar:** content must read premium — dark, moody, cinematic, on-brand. Tracked
  as a manual `aesthetic_score` (1–5) set during vetting.
- **Deal types:** UGC-for-our-channels (core), affiliate / commission, paid partnership.

## Decomposition (whole vision)

- **Phase 1 (this spec):** Creator CRM + automated tracked outreach sequencer. The
  manual-work killer. Creators entered via the admin.
- **Phase 2:** Public `bysolum.co.uk/creators` application page (inbound funnel) that writes
  into the same `creators` table and auto-enrols applicants into the sequence.
- **Phase 3:** Discovery vetting queue (paste handles → Candidate rows; optional paid
  influencer-data API). ToS-safe, no scraping.

---

## Phase 1 architecture (existing stack only)

- **Supabase Postgres** — two new tables (`creators`, `creator_emails`), deployed to dev
  (rodvvmfzkyjsqbufkjbc) and prod (gvfptmjluxpngfjendbi) per the parity rule.
- **Supabase edge functions** — `create-creator`, `creator-outreach-cron`, `resend-webhook`,
  `creator-unsubscribe`.
- **Resend** — sending + native open/click tracking; events delivered to our webhook.
  Outreach uses a **separate sender identity** from transactional email (see Deliverability).
- **pg_cron + pg_net** — schedules the outreach cron function (daily).
- **admin/ React app** — new `CreatorsPage` (route `/creators`) for entry + pipeline + drill-down.

### Data model

`creators` (the CRM record and sequence state):

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| name | text | |
| email | text | unique on `lower(email)` to prevent double-enrolment |
| instagram_handle | text | |
| tiktok_handle | text | |
| niches | text[] | grooming / fitness / everyday / lifestyle |
| follower_count | integer | |
| location | text | free text (UK focus) |
| deal_types | text[] | ugc / affiliate / paid |
| portfolio_url | text | reel / profile link |
| aesthetic_score | integer | 1–5, manual, nullable |
| stage | text | candidate / applied / vetting / contacted / in_talks / active / declined / archived |
| source | text | manual / inbound / scouted |
| sequence_status | text | active / stopped / completed (default active) |
| sequence_step | integer | count of sequence emails sent (0..3) |
| next_email_at | timestamptz | when the next sequence email is due; null when done/stopped |
| unsubscribed | boolean | default false |
| unsubscribe_token | uuid | default gen_random_uuid(); used by the unsubscribe link |
| notes | text | |
| created_at / updated_at | timestamptz | |

`creator_emails` (one row per sent sequence email; the tracking log):

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| creator_id | uuid fk → creators | on delete cascade |
| step | integer | 1 / 2 / 3 |
| template_key | text | intro / follow_up / final |
| subject | text | |
| resend_id | text | Resend message id, indexed — the webhook match key |
| sent_at | timestamptz | |
| delivered_at / opened_at / clicked_at / bounced_at | timestamptz | set by webhook |
| open_count / click_count | integer | default 0 |

RLS: both tables service-role only (admin app already authenticates; reads go through the
service role in edge functions or an authenticated admin policy — match existing admin
table patterns).

### The 3-email sequence

Templated dark-theme emails (same house style as existing emails; `·`/commas only, min
13px body / 11px labels, hosted logo, unsubscribe footer):

| Step | Offset | template_key | Purpose |
| --- | --- | --- | --- |
| 1 | Day 0 (on entry) | intro | Who SOLUM is, why them, the collab invite + a clear reply CTA |
| 2 | +3 days | follow_up | Short nudge, proof (shoot look, the ritual), lower-friction ask |
| 3 | +7 days from entry | final | Final call, then stop |

Copy lives in a shared module in the function (`_shared/creatorEmails.ts`), keyed by
`template_key`, personalised with `name` and `unsubscribe_token`.

### Automation flow (state machine)

1. **Enter creator** (admin `CreatorsPage` form → `create-creator` fn): insert row with
   `stage='contacted'`, `source='manual'`, `sequence_status='active'`, `sequence_step=0`.
   Immediately send **step 1** via Resend (tracking on), write a `creator_emails` row,
   set `sequence_step=1`, `next_email_at = now()+3d`.
2. **Cron** (`creator-outreach-cron`, daily via pg_cron): select creators where
   `sequence_status='active'` AND `next_email_at <= now()` AND NOT `unsubscribed` AND
   `stage` NOT IN (in_talks, active, declined, archived). For each: send the next step,
   log it, then:
   - after step 2 → `sequence_step=2`, `next_email_at = created_at + 7d`;
   - after step 3 → `sequence_step=3`, `sequence_status='completed'`, `next_email_at=null`.
3. **Engagement stops the drip:** moving a creator's `stage` to `in_talks/active/declined/
   archived` in the admin sets `sequence_status='stopped'`. (Replies land in the
   harsha@ inbox; you move the stage, which halts automation. No inbound-email parsing in
   Phase 1 — YAGNI.)
4. **Unsubscribe / bounce / complaint:** `creator-unsubscribe` (public link) and the Resend
   webhook set `unsubscribed=true` and `sequence_status='stopped'`.

### Edge functions

- **`create-creator`** — admin-invoked. Validates, dedupes on `lower(email)`, inserts, sends
  step 1, schedules step 2. Returns the new creator row.
- **`creator-outreach-cron`** — no body; does the due-selection + send + advance loop above.
  Idempotent-ish: advances `sequence_step`/`next_email_at` only after a successful Resend
  send, so a re-run does not double-send a step already advanced.
- **`resend-webhook`** — verifies Resend signature (`RESEND_WEBHOOK_SECRET`), matches
  `resend_id`, sets delivered/opened/clicked/bounced timestamps and increments counts; on
  `bounced`/`complained` marks the creator `unsubscribed` + `sequence_status='stopped'`.
- **`creator-unsubscribe`** — `GET ?token=<uuid>`; sets `unsubscribed=true`,
  `sequence_status='stopped'`; returns a simple confirmation page.

### Admin UI (`admin/` app)

New `CreatorsPage.jsx` + `/creators` route and nav entry, following existing page patterns
(OrdersPage / CustomersPage):
- **Add creator** form (all `creators` fields; niches/deal_types as multi-select).
- **Pipeline view** grouped by `stage` (table or simple board), filterable.
- **Drill-down** per creator: details, editable stage (changing to a terminal stage stops
  the sequence), aesthetic_score, notes, and the **email history** from `creator_emails`
  with delivered/opened/clicked timestamps and counts.

### Deliverability (guardrail)

- Outreach sends from a **dedicated identity** on the separate domain
  `creators.bysolum.com`, e.g. `SOLUM Creators <hello@creators.bysolum.com>`,
  `reply_to: contact@bysolum.com`. This isolates cold-outreach reputation from the
  transactional `orders.bysolum.co.uk` sender, and replies land in the shared
  contact@ inbox rather than a personal one.
- Every email includes `List-Unsubscribe` (one-click) + a visible unsubscribe link to
  `creator-unsubscribe`.
- Cron sends with the same ~4s spacing pattern used by the blast; daily volume is tiny.
- Only pre-vetted creators are entered, keeping complaint rate low.

## Error handling

- Missing `RESEND_API_KEY` / secrets → 500 with a clear message; nothing sent.
- Per-send Resend failure → logged on the `creator_emails` row (no `resend_id`/`sent_at`),
  counted, sequence pointer NOT advanced so the next cron retries that step once.
- Webhook signature mismatch → 401, ignored.
- Duplicate email on entry → 409 with the existing creator id (no re-enrolment).

## Testing

- **Unit (Vitest, pure logic):** due-selection predicate, step→next_email_at scheduling,
  advancement/stop transitions. These are extracted as pure functions to be node-testable.
- **Manual/e2e:** add a test creator (a controlled address) → confirm step 1 arrives and is
  logged → invoke the cron with a back-dated `next_email_at` → confirm step 2 → open the
  email → confirm the webhook stamps `opened_at`. Verify a terminal stage change stops it.

## Setup prerequisites (one-time, flagged for the plan; some need user action)

1. Verify `creators.bysolum.com` as a Resend sending domain (SPF/DKIM/DMARC DNS records)
   — **Harsha is creating this domain**; sender `hello@creators.bysolum.com`.
2. Create the Resend webhook endpoint + `RESEND_WEBHOOK_SECRET` (dev + prod secrets).
3. Enable pg_cron + pg_net and schedule `creator-outreach-cron` daily (dev + prod).

## Files (Phase 1)

| File | Change |
| --- | --- |
| `supabase/migrations/<ts>_create_creators.sql` | Create — `creators` + `creator_emails` + indexes + RLS |
| `supabase/functions/_shared/creatorEmails.ts` | Create — 3 templated emails, keyed |
| `supabase/functions/create-creator/index.ts` | Create — entry + send step 1 |
| `supabase/functions/creator-outreach-cron/index.ts` | Create — scheduled sequencer |
| `supabase/functions/resend-webhook/index.ts` | Create — open/click/bounce tracking |
| `supabase/functions/creator-unsubscribe/index.ts` | Create — unsubscribe endpoint |
| `admin/src/pages/CreatorsPage.jsx` | Create — CRM UI |
| `admin/src/App.jsx` | Modify — add `/creators` route |
| `admin/src/components/*` (nav) | Modify — add Creators nav link |

## Out of scope for Phase 1 (later phases)

- Public application page (Phase 2).
- Discovery vetting queue + paid data API (Phase 3).
- Inbound reply parsing / auto-stage-detection.
- Affiliate code issuance (ties into the existing referral system; separate work).
