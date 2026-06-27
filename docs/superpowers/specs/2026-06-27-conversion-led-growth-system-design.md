# SOLUM — Conversion-Led Growth System (Design Spec)

> Created 2026-06-27 · Branch: dev · Supersedes the previous reels/champion-challenger CPV strategy (retired).
> Source creative: June 2026 shoot — 148 photos (`SOCO_SOLUM_SE-*.jpg`) + 6 videos.
> Builds on shipped tracking program (`docs/runbooks/2026-06-26-ads-campaign-runbook.md`, PostHog dashboards 776101/776102).

---

## 1. Goal & Decisions (locked)

**Primary goal:** Purchases, with on-site engagement as the path — the buy decision is *earned* via the landing experience, not forced.

| Decision | Locked value |
|---|---|
| Conversion goal | Purchase, engagement as the path |
| Landing destination | Funnel-stage dependent: cold → `/`, warm → `/` or `/ritual`, hot → `/buy` |
| Traffic engine | Both, **paid-led** (paid = conversion engine, organic supports trust/proof) |
| Scope | Creative + ads + landing-tuning |
| Landing approach | **Reuse + tune existing `/` homepage** (no new page; unified tracking) |
| Buy flow | `/buy` is **LIVE on real Stripe** — purchase optimisation viable now |
| Budget | **~£35/day** combined Meta + TikTok (£20–50 band) |
| Dead ends | `/founding-100` is dead (do not use); old shame-hook reels retired |

**Why retire the old strategy:** old reels optimised for cheap profile visits (CPV), not conversions. The new shoot is conversion-grade (premium ritual-in-action + editorial proof), and the goal moved from reach to revenue.

---

## 2. Funnel Architecture (budget-matched)

At ~£35/day there is **not enough purchase volume to optimise cold ads on Purchase** (algorithms need ~50 conversion events/ad set/week to exit learning). Therefore: **optimise cold on engagement, hot on purchase.**

| Stage | Optimise on | Audience | Lands on | Ladder |
|---|---|---|---|---|
| **Cold** | `QualifiedVisit`¹ | Broad UK men 18–45, exclude warm + purchasers | `/` (UTM + message-match hero) | L1–L2 |
| **Warm** | ViewContent / InitiateCheckout | Site engagers (QV 14d) + video-50% viewers | `/` or `/ritual` | L3–L4 |
| **Hot** | Purchase / CompletePayment | VC+IC abandoners (14d) | `/buy` | L5 |

¹ Run **Traffic** objective until `QualifiedVisit` accumulates ~50 fires/week, then switch to conversion optimisation on the custom event.

**Budget phasing** (retargeting pools are tiny at launch):
- **Weeks 1–2 (build pool):** Cold 60% / Warm 20% / Hot 20%
- **Weeks 3+ (balanced):** Cold 30% / Warm 35% / Hot 35%

Audience + campaign mechanics (exclusions, dedup, frequency caps, platform terminology) inherit from the existing ads runbook.

---

## 3. Creative System

Shame/gross-out hooks are retired. New creative is **premium, proof-led**, mapped to funnel temperature.

**Shoot asset buckets** (full inventory in `artefacts/solum-content-plan-shoot-june2026.md`):
- A Product hero · B Packaging macro (headline copy baked in) · C Kit/group hero · D Ritual-in-action (color) · E Editorial portrait · F B&W editorial/mood.
- Videos: 5 product films (9:16) + `BANNER FILM` (4K 16:9 70s → reframe 9:16 + 6/9/15/30s cutdowns).

**Mapping to funnel:**
- **Cold (L1–L2):** the gap + mechanism, shown through *premium* ritual-in-action (back cloth, scalp massager, mitt) — beautiful, not disgusting. Reels from product films + banner cutdowns; GAP stills from packaging-macro frames.
- **Warm (L3–L4):** the system + origins — ritual films, Morocco/Korea provenance, kit-hero carousels, ritual-step carousels.
- **Hot (L5):** identity + offer — editorial portrait (90), kit hero (50), "GROUND £65 / RITUAL £85, first batch limited."

**Formats:** 9:16 reels (primary) · 4:5 carousels · single stills · slideshow videos. All produced locally via **ffmpeg** (3 crops where relevant: 9:16, 4:5, 1:1; H.264 yuv420p, `+faststart`).

**Output convention:** `artefacts/social/<batch>/<id>_<format>.{mp4,jpg}` + per-post `.txt` caption/hashtags (≤5 hashtags). Both platforms post the same core asset; captions/first-frame tuned per platform.

---

## 4. Landing Conversion Tuning (reuse `/`)

`FullSite` is already a conversion-structured, instrumented scroll (Hero → ritual films → products/kits → problem → proof → FAQ → CTA, with scroll-depth + `section_viewed` + QualifiedVisit tracking). Targeted changes only:

1. **Remove `FathersDayPopup`** — stale seasonal interrupt on cold traffic.
2. **Re-cut Hero + `RitualInAction` films** using the new shoot (stronger than current assets).
3. **Campaign message-match hero variants** via existing `abtests.js` + `useVariant` (no new pages) so the ad promise matches the first scroll.
4. **Sharpen the kit CTA** — make buy intent reachable earlier / sticky, not buried below the long scroll.
5. **Verify** `QualifiedVisit` + video-progress fire cleanly (cold optimisation depends on this signal).

Out of scope: rebuilding the homepage, new routes, checkout changes.

---

## 5. Measurement & Success Criteria

- **North star:** purchases + CAC. One-time GROUND gross profit ≈ £48 → keep **CAC < ~£28** to stay healthy against the LTV model.
- **Leading indicators** (PostHog dashboards 776101 Deep Funnel / 776102 Overview, prod-host filtered): QualifiedVisit rate, scroll-50, ritual-video-50, `/buy` reach, checkout-initiated → purchase rate, EMQ on Purchase (≥8.0 Meta).
- **Cadence:** weekly review; kill/scale on CPA + engagement quality, **not CPV**.

---

## 6. Phasing

- **Phase 0 (this week):** produce first creative batch + landing tuning + build ad audiences.
- **Phase 1 (wk 1–2):** launch cold (QV-optimised) + daily organic; build retargeting pool.
- **Phase 2 (wk 3–4):** turn on warm + hot; optimise hot on Purchase.
- **Phase 3:** scale winners; refresh creative from the reserve photo library (champion/challenger on cold).

---

## 7. Non-Goals (YAGNI)
- No new landing page / route.
- No waitlist / email-capture funnel (purchase is the goal; site is live).
- No generative video (only recompose shoot assets).
- No checkout/payment changes.
