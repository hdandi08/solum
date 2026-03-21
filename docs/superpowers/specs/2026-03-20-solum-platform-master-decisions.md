# SOLUM Platform — Master Decisions Log

> **Purpose:** Single source of truth for all product, pricing, and technical decisions made during the full website overhaul brainstorm session on 2026-03-20. Load this file at the start of any session continuing this work.

---

## Kit Structure

Three tiers. Names are locked.

| Tier | Name | Status |
|---|---|---|
| 1 | **GROUND** | Live at launch |
| 2 | **RITUAL** | Live at launch — the one we want everyone on |
| 3 | **SOVEREIGN** | Listed on site, Coming Soon — not orderable at launch |

SOVEREIGN becomes purchasable when Products 09 + 10 are ready to ship.

---

## Product Lineup

Source of truth: ComingSoon.jsx (not CLAUDE.md which is outdated).

| # | Product | Status | Kit |
|---|---|---|---|
| 01 | Body Wash 250ml | Live | All |
| 02 | Italy Towel Mitt (viscose rayon) | Live | All |
| 03 | Back Scrub Cloth 70cm | Live | All |
| 04 | Scalp Massager (silicone) | Live | All |
| 05 | Atlas Clay Mask 200g | Live | All |
| 06 | Argan Body Oil 50ml | Live | RITUAL + SOVEREIGN |
| 07 | Body Lotion 400ml | Live | All |
| 08 | Bamboo Cloth | Live | All |
| 09 | Turkish Kese Mitt (artisan) | Coming Soon | SOVEREIGN only |
| 10 | Beidi Black Soap | Coming Soon | SOVEREIGN only |

**SOVEREIGN replaces Product 02 (Italy Towel Mitt) with Product 09 (Turkish Kese Mitt). Does not include 02.**

### Kit Contents

| Product | GROUND | RITUAL | SOVEREIGN |
|---|---|---|---|
| 01 Body Wash | ✅ | ✅ | ✅ |
| 02 Italy Towel Mitt | ✅ | ✅ | ❌ (replaced by 09) |
| 03 Back Scrub Cloth | ✅ | ✅ | ✅ |
| 04 Scalp Massager | ✅ | ✅ | ✅ |
| 05 Atlas Clay | ✅ | ✅ | ✅ |
| 06 Argan Oil | ❌ | ✅ | ✅ |
| 07 Body Lotion | ✅ | ✅ | ✅ |
| 08 Bamboo Cloth | ✅ | ✅ | ✅ |
| 09 Turkish Kese Mitt | ❌ | ❌ | ✅ (coming soon) |
| 10 Beidi Black Soap | ❌ | ❌ | ✅ (coming soon) |

---

## Pricing

### First Box (one-time, includes all tools + consumables)

| Kit | Price | COGS | Margin |
|---|---|---|---|
| GROUND | £55 | £18.52 | 66% |
| RITUAL | £85 | £24.02 | 72% |
| SOVEREIGN | £110 | £30.10 | 73% |

*COGS assumes £1 bamboo cloth, £2 Beidi Black Soap — confirm when trade costs arrive.*

### Monthly Subscription (consumables only, tools already delivered)

| Kit | Price | Avg COGS | Avg Margin |
|---|---|---|---|
| GROUND | £38/mo | £15.35 | 60% |
| RITUAL | £48/mo | £17.20 | 64% |
| SOVEREIGN | £58/mo | TBD | ~60%+ |

---

## Replenishment Cadence

Flat monthly subscription price regardless of which box ships that month.

| Cadence | Products | Notes |
|---|---|---|
| **Monthly** | 01 Body Wash · 07 Lotion · 08 Bamboo Cloth | Small box. Ships every month. |
| **Quarterly** | 02 Italy Towel Mitt · 03 Back Scrub Cloth · 05 Atlas Clay · 06 Argan Oil (RITUAL+) | Larger box. Replaces monthly in months 3, 6, 9, 12. |
| **Every 6 months** | 04 Scalp Massager | Slots into the relevant quarterly box. |

---

## Ritual Correction

**Italy Towel Mitt (02) is weekend/weekly use only — NOT daily.** Viscose rayon is too aggressive for daily use.

**Daily Ritual (10 min):** 04 Scalp Massager → 01 Body Wash → 03 Back Scrub Cloth → 08 Bamboo Cloth → 07 Lotion

**Weekly Ritual (18 min):** 04 Deep Scalp → 05 Atlas Clay → 02 Italy Towel Mitt → 08 Bamboo Cloth → 06 Argan Oil

---

## Discount Strategy

- **First box only** — discounts apply to the first box price, never the monthly subscription.
- Monthly subscription price is protected — never discounted.
- Early access list offer: 20% off first box at launch.
- Promo codes handled via Stripe Coupons.

---

## Loyalty Programme — T-Shirt

- After 6 months of continuous subscription → customer receives a SOLUM t-shirt free.
- **Month 3:** Prompt in account area / email to select t-shirt size.
- **Month 6:** T-shirt ships with that month's subscription box.
- Image reference: `~/Downloads/solum-tshirt.jpeg`

---

## Technical Stack — Locked

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite | Already built |
| Hosting | AWS Amplify | Already live |
| Analytics | Plausible | Already wired in index.html |
| Backend / DB | Supabase (PostgreSQL) | Decision: 2026-03-20 |
| Payments | Stripe | Decision: 2026-03-20 |
| Auth | Magic link (Supabase Auth) | No passwords |
| Subscriptions | Stripe Billing + Supabase | Stripe handles billing, Supabase handles state |

---

## Project Decomposition — 5 Specs

| Spec | Title | Status | Dependencies |
|---|---|---|---|
| **1** | Content & Product Overhaul | 🟡 In progress | None |
| **2** | Backend Foundation (Supabase schema + auth) | ⬜ Not started | None |
| **3** | Checkout & Payments (Stripe) | ⬜ Not started | Spec 2 |
| **4** | Subscription Lifecycle | ⬜ Not started | Specs 2 + 3 |
| **5** | Discounts & Loyalty | ⬜ Not started | Specs 2 + 3 |

---

## Session Notes

- CLAUDE.md product lineup is **outdated** — Product 08 is Bamboo Cloth, not Kese Mitt. Update CLAUDE.md.
- Beidi Black Soap trade cost: estimated £2, confirm when sourced.
- Bamboo Cloth trade cost: estimated £1, confirm when sourced.
- SOVEREIGN pricing at £110 first box / £58 monthly — set now, activates when 09+10 are ready.

---

*Last updated: 2026-03-20 · Session: full website overhaul brainstorm*
