# SOLUM Creator Program — Phase 2: Public /creators Application Page — Design

> Status: approved in brainstorm 2026-07-06. Builds on Phase 1
> (`2026-07-06-creator-program-design.md` / `-phase1.md`). Reuses the `creators`
> table and the `creators.bysolum.com` outreach sender. NO DB migration required.

## Goal

A premium public landing page at `bysolum.co.uk/creators` that pitches why a creator
should partner with SOLUM and collects applications, feeding the same `creators` CRM the
team already manages. It is the single "front door" every acquisition channel points at
(IG bio, cold outreach email, customer email, paid ads).

Success = a creator lands on `/creators`, understands the offer, submits a vettable
application (name, email, IG, portfolio link, followers, niche), lands in the CRM as
`stage='applied'`, and gets a confirmation email — with zero manual data entry by the team.

## Who we recruit (page framing)

- Premium **male creators AND couples** who shoot **dark, cinematic, premium** content.
  The "who we want" section sets this bar explicitly; it is also the quality filter.

## The offer (hooks, in priority order)

1. **Get paid** — paid collaborations. **Do NOT disclose amounts** anywhere on the page or
   in copy; rates are discussed after vetting. Language: "paid collaborations", "get
   rewarded", never a figure.
2. **Free premium kit** — the full guided SOLUM system to keep and film with.
3. **Ongoing affiliate** — a code/link for commission on sales (mentioned, not detailed).

USP threaded throughout: SOLUM is a **guided body care system for men** (not another bottle) —
the guided routine is the differentiator.

## Page structure (`/creators`, premium dark)

Single scrolling page, SOLUM house style (SOLUM Black `#08090B`, Bone `#F0ECE2`, Steel/Sky
blue accents; Bebas Neue wordmark, Barlow Condensed; min 13px body / 11px labels; NO
em/en/double dashes, `·`/commas only). Uses June shoot imagery already on the CDN.

1. **Hero** — headline ("Get paid to create with SOLUM." or similar), one-line subhead
   (guided body care system · paid · free kit), shoot image, a "Apply below ↓" cue.
2. **The offer** — three cards: Get paid (paid collaborations, no figures) · Free premium
   kit · Ongoing affiliate.
3. **Who we want** — premium male creators + couples who shoot dark, cinematic content.
   States the bar plainly.
4. **How it works** — Apply → we review your content → kit + brief sent → you create →
   you get paid.
5. **Application form** — see fields below.
6. **On submit** — inline thank-you state ("Thanks, we will review your content and be in
   touch") + a confirmation email.
7. Footer — SOLUM wordmark, links to main site.

## Application form

| Field | Required | Maps to `creators` column |
| --- | --- | --- |
| Name | yes | `name` |
| Email | yes | `email` |
| Instagram handle | yes | `instagram_handle` |
| Portfolio / reel link | yes | `portfolio_url` |
| Follower count | yes | `follower_count` (integer) |
| Niche | yes | `niches` (grooming / fitness / lifestyle / couples / everyday) |
| TikTok handle | no | `tiktok_handle` |
| Interested in (UGC / affiliate / partnership) | no | `deal_types` |
| Note / why you're a fit | no | `notes` |

Client-side validation: required fields present, email format, a light MX-style sanity
check is NOT needed here (low-stakes, unlike checkout). Follower count coerced to integer.
Niche is a select including a new **`couples`** option (free-text array column, no schema
change).

## Submit flow

New edge function **`submit-creator-application`** (mirrors the existing `join-waitlist` /
`submit-founding-job` intake pattern), deployed dev + prod.

1. Validate payload (required fields, email shape). Reject 400 on missing required fields.
2. **Reconcile by email** (the `creators` unique index is on `lower(email)`, an expression
   index, so use explicit lookup, not supabase-js `upsert(onConflict)`):
   - `select ... from creators where email ilike <email>` (case-insensitive).
   - **Exists** (e.g. a cold-outreach row): UPDATE it — fill in the submitted fields, set
     `stage='applied'`, `source` stays or becomes `'inbound'`, and **`sequence_status='stopped'`**
     (they engaged, so stop the cold drip), `updated_at=now()`.
   - **New:** INSERT with `stage='applied'`, `source='inbound'`, `sequence_status='stopped'`
     (inbound applicants are NOT auto-cold-emailed; the team vets and reaches out),
     `sequence_step=0`, `next_email_at=null`.
3. Send a **confirmation email** (template `application_received`) via the
   `creators.bysolum.com` sender (`hello@creators.bysolum.com`, reply-to `contact@bysolum.com`).
4. Return `{ ok: true }`. Errors return `{ ok:false, error }` with a friendly page message.

Inbound applicants deliberately do NOT enter the 3-email cold sequence (that sequence is
for people WE cold-contacted). They sit at `stage='applied'` for the team to vet in the
admin CRM.

## Confirmation email (new template)

Add key `application_received` to `supabase/functions/_shared/creatorEmails.ts`'s `COPY`
(same dark template shell, unsubscribe link, curly apostrophes). Copy: thanks for applying,
we review every application and will be in touch if it is a fit, no amount disclosed.
`application_received` is NOT part of `SEQUENCE` (it is a one-off), so `sequence.mjs` is
untouched.

## Outreach email change (Phase 1 templates)

Update the existing `intro` / `follow_up` / `final` templates in `creatorEmails.ts`:
- CTA changes from "See SOLUM" → **"Apply to create →"** pointing at
  `https://bysolum.co.uk/creators?utm_source=email&utm_medium=email&utm_campaign=creator_outreach`.
- Fold in the **guided-system copy rewrite** (lead: "SOLUM is a guided body care system for
  men, head to toe … the guided routine that tells you what to use, where, and when").
This unifies the funnel: cold outreach now drives to the same form.

## Tracking

- `/creators` fires a PostHog pageview (SPA history_change already enabled).
- On successful submit, fire a `creator_application_submitted` event (client) for funnel
  visibility. Form page carries through any `utm_*` params (attribution to channel).

## Error handling

- Missing required field → 400, inline field errors on the form.
- Duplicate email → treated as an UPDATE (re-application), not an error; still returns ok +
  sends the confirmation.
- Resend/confirmation-email failure → the application is still saved (do not fail the
  submit on email); log the error server-side.
- `RESEND_API_KEY` missing → 500 with clear message.

## Testing

- **Unit (vitest, web):** the form's pure validation helper (required fields, email shape,
  follower-count coercion) → `web/src/lib/creatorApplication.js` + test.
- **Manual/e2e:** submit the dev form → row appears in `creators` as `applied` → confirmation
  email arrives → re-submit same email updates the row + stops any active sequence. Deno
  function verified at deploy (no local deno).

## Files

| File | Change |
| --- | --- |
| `web/src/pages/CreatorsApplyPage.jsx` | Create — the public page + form |
| `web/src/lib/creatorApplication.js` (+ `.test.js`) | Create — pure validation helper + tests |
| `web/src/App.jsx` | Modify — add `/creators` route |
| `supabase/functions/submit-creator-application/index.ts` | Create — intake + reconcile + confirmation email |
| `supabase/functions/_shared/creatorEmails.ts` | Modify — add `application_received`; change outreach CTA to `/creators` + guided-system copy |

## Out of scope (later / separate)

- The customer/lead "become a creator" recruitment email blast (a separate send, like the
  free-delivery blast).
- Paid recruitment ad creative.
- Fixing the Phase 1 unsubscribe-link broken-HTML bug (tracked separately; fix before/with
  the prod go-live).
- Admin CRM changes (the applied rows already show in the Phase 1 Creators page).
