# SOLUM — Brand Story at the Top of the Page

> Design spec · 2026-06-25 · branch `dev`
> Goal: make the SOLUM story land clearly in the first two screens — an intriguing hook, then a
> short structured explainer of the USP — so visitors understand what SOLUM is and why it's
> different before they reach the ritual and kits.

## 1. The positioning (locked)

SOLUM's story is three pillars:

1. **Body** — for the body, the skin from the neck down. Not face, not hair. The 90% of a man's
   skin no brand ever built a routine for.
2. **Guided system, not products** — most brands hand you bottles. SOLUM hands you the method:
   which products, in what order, with what technique. Guided, not guessed.
3. **Ten-minute compression** — the whole head-to-toe routine compressed into the shower you
   already take. Better skin, no extra time.

Anchor line (positioning/credibility): **"The world's first guided body ritual for men."**

Narrative move at the top: **anchor → provoke → answer → act**, then a scannable explainer that
resolves the hook and plants all three pillars before the deeper sections.

## 2. Hero copy (revise `web/src/components/Hero.jsx`, non-Father's-Day variant only)

- **Eyebrow (anchor)** — new small line above the headline:
  `THE WORLD'S FIRST GUIDED BODY RITUAL FOR MEN` (Barlow Condensed, letter-spaced, uppercase,
  `--blit` accent, 11px — same style as other section eyebrows).
- **Headline (hook)** — replaces "THE FIRST GUIDED BODY RITUAL FOR MEN":
  `You shower every day. So why don't you feel clean?`
  (Keep Bebas Neue, large; ensure it works big on mobile over the film — 3–4 lines is fine.)
- **Sub-line (resolve)** — replaces the current paragraph:
  `A shower only wets the surface. It leaves the dead skin and bacteria that dull your skin and
  cause odour. SOLUM clears it — head to toe, in the 10 minutes you already spend in the shower.`
- **CTAs** — unchanged (GET YOUR KIT · SEE THE KITS), unchanged targets/analytics/A-B.
- **Scope pills** — the two pills (`Body Care — Not Face, Not Hair`, `Built For Men`) are
  replaced by the eyebrow anchor; remove them from this variant (they're redundant with the new
  explainer). Keep the `.hero-scope` markup only if needed for the FD variant.
- **Mobile behavior (already built):** on mobile the film is a full-bleed background and the
  sub-line + pills are hidden. With this change, mobile shows: eyebrow anchor + hook headline +
  CTAs over the film. The hook's question stays **deliberately open** on mobile — the explainer
  section immediately below answers it (drives the scroll). Desktop shows the sub-line.
- The Father's Day variant (`IS_FATHERS_DAY` / `hero-fd-*`) is **out of scope** — leave as-is.

## 3. New section — "What SOLUM is" (3-pillar explainer)

Create `web/src/components/WhatSolumIs.jsx` and place it in `web/src/pages/FullSite.jsx`
**between `<Hero />`/`<Marquee />` and `<RitualInAction />`** (after Marquee, before RitualInAction).

Content (locked copy):
- **Eyebrow / header:** `NOT PRODUCTS. A SYSTEM.`
- Three pillars, numbered ①②③, each a short title + one line:
  1. **The body, finally.** — "Face and hair got routines decades ago. Your body — 90% of your
     skin — never did."
  2. **Guided, not guessed.** — "We don't hand you bottles. We hand you the ritual: what, in what
     order, how."
  3. **Ten minutes.** — "The whole thing, compressed into the shower you already take. Better
     skin, no extra time."
- Optional single closing CTA/link to `/ritual` or the kits is **out of scope** for v1 — the
  RitualInAction section right below already carries the "See the full ritual" CTA.

Layout:
- Desktop: a 3-column row (one pillar per column) under the header, generous spacing, dark
  (`--black`/`--char`) surface, numbers in `--blit`/Bebas, titles in Bebas, body in Barlow 300.
- Mobile: stack to one column.
- A short, scannable section — header + 3 pillars only. No imagery required (keeps it fast and
  text-clear); it is the one intentionally text-forward beat in an otherwise picture-heavy page,
  by design — it's the "what is this" explainer.
- Reuse existing tokens/fonts. Min font sizes 13px body / 11px labels. Section gets `id="what"`
  (or similar) so nav/anchor + section_viewed analytics keep working.

## 4. Flow after the change

`Hero (hook) → Marquee → What SOLUM is (3 pillars) → Ritual in Action → Products → Kits → …`

This resolves the layout gap: visitors get *what SOLUM is and why it's different* in one scannable
hit before the ritual steps and kit selection.

## 5. Constraints

- Brand rules (CLAUDE.md): wordmark uppercase; never "soap"; palette only (`--black`,`--char`,
  `--blue`,`--blit`,`--bone`, gold for weekly); Bebas Neue headings, Barlow Condensed body.
- Min font sizes 13px body / 11px labels.
- Don't touch checkout, A/B framework, analytics wiring, or the Father's Day variant.
- Keep the mobile full-bleed-film hero intact (section 2 mobile behavior).
- Verify locally (`npm run dev`) at desktop + mobile widths before commit; build must pass.

## 6. Out of scope (later, if wanted)

- Reworking copy in the lower sections (Truth, Provenance, Founder, FAQ) to echo the 3 pillars.
- Imagery inside the explainer section.
- Changing the Father's Day hero variant.
- e2e assertions for the new section (fold into the pending e2e pass).

## Self-review notes
- No placeholders; copy is final/locked. Single, focused scope (hero copy + one new section +
  one placement). Hero mobile behavior is consistent with the already-shipped full-bleed film.
- Hook intentionally unanswered on mobile is a deliberate decision (drives scroll to explainer),
  stated explicitly so it isn't read as a bug.
