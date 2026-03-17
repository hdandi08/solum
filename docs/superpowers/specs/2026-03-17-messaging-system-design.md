# SOLUM Messaging System — Design Spec
**Date:** 2026-03-17
**Status:** Approved — Implementation Pending
**Scope:** Website · Instagram · Ads · Reels

---

## 0. Pre-conditions Before Implementing Page Changes

- **Product count:** The live page currently renders 9 product pills (01–09) while the system is built around 8 products. Product 09 (Kese Mitt) is reserved for a future World Kit. The fix is limited in scope: remove only the Product 09 entry from the `PRODUCTS` array in `ComingSoon.jsx` (line 622). Do not change any other product names, numbers, or ritual assignments — those are deferred to the lineup audit below.
- **Ritual product assignments:** The live page ritual steps diverge from the original master brief (Bamboo Cloth 08 replaced Italy Towel Mitt 02 in the daily ritual; product numbers reflect a lineup revision not yet reflected in CLAUDE.md). The page's current ritual structure is taken as canonical for this implementation. A full product lineup audit should be done as a separate task.

---

## 1. Strategic Foundation

### The Single Truth SOLUM Owns

> Men have been showering wrong their entire lives. Not laziness. Not ignorance. No one ever built them the system.

This is the strategic anchor. Every piece of content — page, post, ad, reel — connects back to this truth. It creates urgency (you've been getting this wrong), removes blame (not your fault), and positions SOLUM as the inevitable solution.

### First Emotional Reaction (what a man feels before he reads anything)

**Urgency** — *"I've been neglecting this and I need to fix it now."*

Not aspiration. Not curiosity. Urgency. The hook always makes him feel the problem before it offers the solution.

---

## 2. The Message Ladder

Every channel runs this ladder in order. A post may only hit layers 1–2. An ad hits 1–3. The full page hits all 5. The order never changes.

| Layer | Name | Purpose | Example |
|---|---|---|---|
| 1 | **The Wrong** | Names the problem with urgency. Makes him feel it. | *"Your back has never been clean."* |
| 2 | **The Why** | Removes blame. Not laziness — nobody built the system. | *"Not your fault. Nobody taught you this."* |
| 3 | **The Fix** | SOLUM. Concrete and specific. | *"10 minutes. 8 products. Two rituals."* |
| 4 | **The Proof** | Physical outcomes by week. Tangible, not aspirational. | *"Week 1: dead skin rolls off. Week 2: odour reduces."* |
| 5 | **The Identity** | Who they become. The keep layer. | *"This is what it means to actually take care of yourself."* |

---

## 3. Tone Rules

### The Voice
Short sentences. Declarative. No hedging. Reads like a man who knows exactly what he's talking about.

### Rules

| Rule | Correct | Incorrect |
|---|---|---|
| Empathetic on cause | *"Nobody built men this system"* | *"Men don't care about their skin"* |
| Confrontational on result | *"You've been getting this wrong"* | *"You might want to consider..."* |
| Specific, never vague | *"Dead skin feeds odour bacteria"* | *"Feel fresher and cleaner"* |
| Urgency without shame | *"You've been getting this wrong. Now you know why."* | *"Most men are failing at this"* |
| Numbers anchor truth | *"70% more moisture in 3 minutes"* | *"Deeply hydrating formula"* |
| Never "pamper" | Always "do this right" | *"Treat yourself"* |
| Never "soap" or "skincare" | Body care. Body ritual. | *"Skincare for men"* |
| No gender comparison | Men, for men | *"Women have routines, men don't"* |

### Tone Shift Across the Ladder
- **Layers 1–2 (Wrong + Why):** Direct, almost blunt. No softening.
- **Layers 3–4 (Fix + Proof):** Confident, instructional. Coach, not salesman.
- **Layer 5 (Identity):** Quiet. One line. Let it land.

---

## 4. Audience

**Primary:** The man with zero routine — showers, uses whatever's in the bathroom, never thought about it.
**Secondary:** The man who buys premium products individually but has no system — self-selects in naturally once exposed to the ladder.

Lead with the gap to attract volume. Premium buyers recognise themselves in the proof layer.

---

## 5. Origins — Proof Layer Only

Korean, Moroccan, Turkish, UK traditions are **proof of why the products work**, not the brand hook. They appear at Layer 3–4 (Fix + Proof), never in the opening hook.

Each origin reference should open with what the tradition **solves**, not where it's from.

- **Wrong:** *"The Italy Towel — tools of the Korean jjimjilbang."*
- **Right:** *"Centuries of men removing dead skin that soap never touches."* — then the tool, then the tradition name.

---

## 6. Channel Application

### Website (Coming Soon Page)

Full ladder, top to bottom. Section mapping:

| Page Section | Ladder Layer | Notes |
|---|---|---|
| Eyebrow + H1 | Layer 1 — The Wrong | H1 must create urgency, not just reframe |
| Subhead | Layer 2 — The Why | Current copy is good |
| Stats (Week 1/2/3/Day 66) | Layer 4 — The Proof | Add one framing line before stats: *"Here's what actually happens when you do it right:"* |
| Provenance section | Layer 3 support | Reframe card openers: outcome first, origin second |
| Ritual section | Layer 3 — The Fix | Step notes lead with outcome, not instruction |
| Subscription section | Layer 5 — The Identity | Current 66-day copy is strong |
| CTA | — | Outcome-led. Current *"See the difference by week one"* is correct. |

### Instagram

| Format | Layers | Structure |
|---|---|---|
| Static image | 1–2 | One confrontational truth. No product. Dark bg, Bebas Neue. |
| Carousel | 1–4 | Slide 1 = The Wrong. Slides 2–4 = Why + Proof. Last slide = SOLUM. |
| Reel | 1–3 | Hook (The Wrong, 2s) → Why (5s) → Fix (10–15s) |

**Caption rule:** Always open with Layer 1. Never start with SOLUM. Never start with a product name.

**Reel format detail:**
- Hook: text overlay + spoken (same line). Must land The Wrong in under 2 seconds.
- Body: voiceover with b-roll (no talking head). Why in 5s, Fix in 10–15s.
- Caption: runs Layer 1–2 only. The visual carries Layer 3. End caption with a question or curiosity loop — never "buy now" in awareness phase.
- Product visibility: show product as proof tool, not as hero. Product appears at Layer 3 (The Fix), not before.

### Ads

Single job: stop the scroll, create urgency, send to page.

- Lead with Layer 1 only
- One outcome stat as proof (Layer 4)
- CTA links to coming soon page
- Example: *"Your back has never been clean. Here's why — and how to fix it."*

---

## 7. Coming Soon Page — Specific Changes Required

> **Status:** These three changes are prescribed but not yet applied to the live page (`web/src/pages/ComingSoon.jsx`).

### Change 1 — H1 (urgency, not reframe)
**Current:** *"Your Shower Routine Isn't A Body Routine."*
**Problem:** Repositions the category (smart) but doesn't make the man feel the problem.
**Direction:** Name what's wrong physically. Test: does it make him feel something before he reads the next line?
**Candidates:**
- *"You've Been Clean. Your Body Hasn't."*
- *"You Shower Every Day. Your Body Is Still Dirty."*

### Change 2 — Stats framing line
**Current:** Stats appear with no intro — the Week 1/2/3 timeline reads as hopeful.
**Fix:** Add one line above the stats block: *"Here's what actually happens when you do it right:"*
This turns the stats from aspirational timeline into confrontational proof.

### Change 3 — Provenance card openers
**Current:** Each card opens with the tool or tradition name.
**Fix:** Each card opens with what that tradition solves — outcome first, then the tool, then the origin.
**Example (Korea):** *"Centuries of men removing dead skin that soap never touches."* → then Italy Towel → then jjimjilbang.

---

## 8. What Does Not Change

- Page structure and sections — same order
- Week 1/2/3/Day 66 stats content — keep, just add the framing intro line
- Subscription section copy — 66-day habit framing is strong
- Ritual step notes — already outcome-led after previous session's changes
- Brand rules — all CLAUDE.md brand rules remain locked

---

## 9. Success Criteria

A man who lands on the coming soon page for the first time should:
1. Feel urgency within the first two lines (Layer 1)
2. Feel understood, not shamed, by the subhead (Layer 2)
3. See specific physical proof before he's asked for his email (Layer 4)
4. Leave knowing exactly what SOLUM does and what happens if he uses it

A single Instagram post should be able to stand alone and run the full ladder in 4–6 lines of caption.

An ad creative should create urgency in one line and be explainable in under 6 words.
