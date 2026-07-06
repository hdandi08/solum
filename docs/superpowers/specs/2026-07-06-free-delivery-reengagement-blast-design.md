# Free-Delivery Re-engagement Blast — Design

> Status: approved 2026-07-06. Supersedes nothing; complements the site-side
> free-delivery offer (`2026-06-30-free-delivery-launch-offer-design.md`).

## Goal

Re-contact everyone on the `leads` list — **except people who already paid** — with an
honest, time-relevant email: UK delivery is free this batch (worth £5.95, our launch
offer) and the first batch is limited stock going fast. Entice lapsed / abandoned
sign-ups to buy. Attribute any resulting purchases back to email.

## Non-goals

- No site / frontend / Stripe / DB-schema / migration changes.
- No new "sale" or discount. Product prices are unchanged (£65 / £85). The incentive is
  free delivery, which is genuinely already free — we are surfacing it, not creating it.
- No change to the existing `send-launch-blast` function; this is a separate function.

## Architecture

A single new Supabase edge function, **`send-freedelivery-blast`**, cloned from the
existing `send-launch-blast` and modified. Deployed to the **prod** project
`gvfptmjluxpngfjendbi` (that is where real `leads` and `customers` live). Sends via
Resend, same sender identity and pacing as the launch blast.

The function is stateless per call. On **every** invocation it recomputes the full
recipient list, then serves a `offset`/`limit` slice of it. Recomputing each call (rather
than paging the raw `leads` table) is what keeps batches deterministic after buyers and
duplicates are removed. The list is small (~150), so full recompute per call is cheap.

### Recipient computation (in order)

1. Fetch **all** rows from `customers`, select `email`. Build a `Set` of
   lowercased/trimmed buyer emails. These are the real payers to exclude.
2. Fetch **all** `leads` (`email, first_name, created_at`) where `email is not null`,
   ordered by `created_at` ascending.
3. **Dedupe by lowercased email**, keeping the earliest occurrence (preserves
   `first_name` from the first sign-up). This is a deliberate improvement over
   `send-launch-blast`, which does not dedupe — required here because we are re-contacting
   and must not email the same person multiple times.
4. **Exclude** any lead whose lowercased email is in the buyer set from step 1.
5. Apply `offset` / `limit` to the resulting stable, ordered array → the batch to send.

Because the ordering (`created_at` asc) and the exclusion/dedup rules are identical on
every call, `offset:0/limit:30`, `offset:30/limit:30`, … tile the same underlying list
with no gaps and no double-sends.

### Modes (mutually exclusive, checked in this order)

| Request body | Behaviour |
| --- | --- |
| `{"dry_run": true}` | Compute the recipient list. Send nothing. Return: `total_recipients`, `excluded_buyers` (count of dedup'd leads dropped because they are customers), `duplicates_removed`, `batches` (ceil(total/limit)), and a `sample` of the first ~5 `{email, first_name}`. |
| `{"test_email": "<addr>"}` | Send exactly one copy of the real creative to `<addr>` (with `first_name` null). Ignore `leads` entirely. Return `{ test: true, to, ok }`. |
| `{"offset": N, "limit": M}` (default `offset:0, limit:30`) | Live batch send to the computed slice. Same 4s inter-email spacing as launch blast. Return `{ total, sent, failed, errors, next_offset }`. |

`dry_run` and `test_email` take precedence over a live send if both are present, so an
accidental extra field cannot trigger a blast.

## Email creative

New `buildFreeDeliveryEmail(firstName)` in the function file. Dark-theme HTML table email
matching the existing launch email house style (SOLUM Black `#08090B` ground, Bone
`#F0ECE2` type, Steel/Sky blue accents).

**Imagery — recent June shoot.** The email leads with
`https://bysolum.co.uk/email/hero-products.jpg` — the recent shoot's product-lineup image
("HEAD TO TOE. CLEANED. NOURISHED. CARED FOR."), which is live on the CDN and carries no
dated campaign text. It is used as the single hero. The launch email's `hero-man.jpg` is
NOT reused: every live person shot from the shoot has baked-in campaign copy ("WE HAVE
OFFICIALLY LAUNCHED", "THE PERFECT FATHER'S DAY GIFT") that does not fit a free-delivery
promo, and the only text-free model frame is a vertical behind-the-scenes still. If a
model hero is wanted later, a clean text-free frame must first be exported and deployed to
`/email/` on the CDN (currently only `hero-man.jpg`, `hero-products.jpg`,
`fd-popup-hero.jpg` return 200; `fd-hero.jpg` / `fd-products.jpg` are 404).

- **Subject:** `Free delivery on your SOLUM kit · first batch, going fast`
- **Angle (both hooks):** free UK delivery this batch, worth £5.95, launch offer + first
  batch / limited kits / once they're gone that's it until the next run.
- **From:** `Harsha from SOLUM <no-reply@orders.bysolum.co.uk>`, `reply_to: harsha@bysolum.com`
  (unchanged from launch blast).
- **List-Unsubscribe** headers preserved (one-click), same as launch blast.
- Two CTA buttons ("ORDER NOW"), both linking to the tracked URL.

### Copy rules (locked)

- No em dash, en dash, or double dash anywhere. Use `·` or commas only.
- Anchored delivery value text: `£5.95`. Never claim the customer "will be charged £5.95"
  — delivery is genuinely free; £5.95 is the anchored worth.
- Min font sizes: 13px body, 11px labels (per project standard).
- SOLUM wordmark rendered via the existing embedded SVG logo (base64), never retyped.

## Tracking / attribution

Every link in the email carries:

```
?utm_source=email&utm_medium=email&utm_campaign=free_delivery
```

When a recipient returns and starts checkout, `leads.utm_medium` and `leads.utm_campaign`
are already captured (per migration `20260410000000_add_source_to_leads.sql`), so
email-attributed leads/purchases are queryable with no additional code. `free_delivery`
distinguishes this campaign from `launch_blast`.

## Operational flow (how it is actually run)

1. **Deploy** `send-freedelivery-blast` to prod `gvfptmjluxpngfjendbi` — only after
   explicit user go-ahead (project rule: ask before deploying edge functions).
2. **Dry run** (`{"dry_run": true}`) — confirm `excluded_buyers` matches the ~2 known
   payers and the recipient total looks right, before any mail is sent.
3. **Test send** (`{"test_email": "harsha@bysolum.com"}`) — user approves the creative in
   their own inbox.
4. **Batch sends** — user runs the batch curl commands themselves (offset 0/30/60/…),
   waiting 2–3 min between batches, watching `sent` / `failed` in each response. A fresh
   `send-freedelivery-commands.txt` artefact is produced with the correct URL, anon key,
   and one command per batch sized to the dry-run total.

## Error handling

- Missing `RESEND_API_KEY` → 500 with a clear message (as in launch blast).
- Per-email Resend failures are caught, counted in `failed`, and appended to `errors[]`;
  the batch continues. Callers inspect the response.
- `customers` / `leads` query errors → 500 with the DB error message; nothing is sent.

## Testing / verification

- No unit test harness exists for edge functions in this repo; verification is via the
  built-in modes: `dry_run` proves the recipient math and exclusion, `test_email` proves
  the creative renders in a real client, before any live batch.
- Dead-simple visual check of the creative HTML by opening a saved copy in a browser
  (an artefact preview file), matching how `email-preview-*.html` files are already used.

## Files

| File | Change |
| --- | --- |
| `supabase/functions/send-freedelivery-blast/index.ts` | Create — the function above. |
| `artefacts/email-preview-freedelivery.html` | Create — static preview of the creative for browser check. |
| `artefacts/send-freedelivery-commands.txt` | Create — per-batch curl commands (URL + anon key + offsets), generated after the dry-run total is known. |
