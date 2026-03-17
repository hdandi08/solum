# Coming Soon Page — Messaging Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved messaging system (Wrong → Why → Fix → Proof → Identity ladder) to the coming soon page — four targeted changes to one file.

**Architecture:** All changes are copy and minor CSS additions to `web/src/pages/ComingSoon.jsx`. No new files. No structural changes. No dependency changes.

**Tech Stack:** React (JSX), inline CSS-in-JS string, Vite dev server

---

## File Map

| File | Change |
|---|---|
| `web/src/pages/ComingSoon.jsx` | All 4 changes — product array, H1 copy, stats intro, provenance copy |

No other files touched.

---

## Pre-flight Check

- [ ] Run `cd web && npm run dev` and confirm the page loads at localhost before making any changes
- [ ] Note current H1 text so you can verify it changed: *"Your Shower Routine Isn't A Body Routine."*

---

## Task 1: Remove Product 09 from pills

**File:** `web/src/pages/ComingSoon.jsx` — `PRODUCTS` array (~line 622)

- [ ] **Remove the product 09 entry**

Find and delete this line from the `PRODUCTS` array:
```js
{ num: '09', name: 'Kese Mitt' },
```

Array should now have exactly 8 entries (01–08).

- [ ] **Update the pills label to match**

Find (around line 852):
```jsx
<div className="cs-products-label">8 Products · The Complete System</div>
```
This label already says 8 — confirm it reads correctly now that 9 pills no longer render. No change needed if already correct.

- [ ] **Verify in browser:** Product pills section shows exactly 8 pills. The label already reads "8 Products · The Complete System" and does not need changing — just confirm the pill count now matches it.

- [ ] **Commit**
```bash
git add web/src/pages/ComingSoon.jsx
git commit -m "fix: remove product 09 pill — Kese Mitt reserved for future World Kit"
```

---

## Task 2: Update H1 copy

**File:** `web/src/pages/ComingSoon.jsx` — hero section (~line 683)

- [ ] **Replace the H1**

Find:
```jsx
<h1 className="cs-headline">
  Your Shower Routine<br /><em>Isn't A Body Routine.</em>
</h1>
```

Replace with:
```jsx
<h1 className="cs-headline">
  You Shower Every Day.<br /><em>Your Body Is Still Dirty.</em>
</h1>
```

- [ ] **Verify in browser:** H1 reads "You Shower Every Day. Your Body Is Still Dirty." — second line in blue. Check it is legible at desktop and mobile widths (font-size uses clamp — should scale fine).

- [ ] **Commit**
```bash
git add web/src/pages/ComingSoon.jsx
git commit -m "feat: update H1 to urgency-led copy — messaging system change 1"
```

---

## Task 3: Add stats framing line

The Week 1/2/3 stats currently appear with no intro — they read as a hopeful timeline. One line above them reframes them as confrontational proof.

**File:** `web/src/pages/ComingSoon.jsx` — styles string + stats section

- [ ] **Add CSS for the intro line**

In the `styles` const string, find the `/* Stats */` comment block (around line 98). Add this class immediately before `.cs-stats {`:

```css
  /* Stats intro */
  .cs-stats-intro {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: rgba(240,236,226,0.75);
    margin-bottom: 16px;
    text-align: center;
  }
```

Also add a mobile override inside the existing `@media (max-width: 768px)` block, alongside the other stats overrides:

```css
    .cs-stats-intro { font-size: 15px; }
```

- [ ] **Add the intro line in JSX**

Find:
```jsx
          {/* 2 — Stats */}
          <div className="cs-stats">
```

Replace with:
```jsx
          {/* 2 — Stats */}
          <div className="cs-stats-intro">Here's what actually happens when you do it right:</div>
          <div className="cs-stats">
```

- [ ] **Verify in browser:** A readable line appears above the stats grid. Font size minimum 15px. Not uppercase, not faded — legible at a glance.

- [ ] **Commit**
```bash
git add web/src/pages/ComingSoon.jsx
git commit -m "feat: add stats framing line — reframe timeline as confrontational proof"
```

---

## Task 4: Rewrite provenance card openers

Each card currently opens with the tool or tradition name. Spec rule: outcome first, then tool, then origin. The card structure (flag → country → tradition title → body → products) stays the same — only `.cs-prov-body` text changes.

**File:** `web/src/pages/ComingSoon.jsx` — provenance section (~lines 724–753)

- [ ] **Replace UK card body**

Find:
```jsx
<div className="cs-prov-body">Amino acid body wash and fast-absorb lotion. Sulphate-free, pH-balanced, skin barrier safe. Cleans without stripping — no tightness, no residue.</div>
```

Replace with:
```jsx
<div className="cs-prov-body">Cleans without stripping. Most body washes use sulphates that remove dirt and your skin barrier at the same time. Amino acid surfactants don't. pH balanced, skin barrier safe — formulated in the UK.</div>
```

- [ ] **Replace Korea card body**

Find:
```jsx
<div className="cs-prov-body">The Italy Towel and back cloth — tools of the Korean jjimjilbang. Centuries of removing dead skin through friction, not chemicals. Dead skin you didn't know existed. Gone after one use.</div>
```

Replace with:
```jsx
<div className="cs-prov-body">Centuries of men removing dead skin that rinsing never reaches. The Korean jjimjilbang perfected exfoliation through friction, not chemicals. The Italy Towel and back cloth bring that to your shower.</div>
```

- [ ] **Replace Morocco card body**

Find:
```jsx
<div className="cs-prov-body">Atlas Mountain clay and cold-pressed body oil. The hammam has used both for over a thousand years. Single ingredient. Nothing added. Skin that's properly fed — not just moisturised.</div>
```

Replace with:
```jsx
<div className="cs-prov-body">Pulls out what daily washing never reaches. The Moroccan hammam has used Atlas Mountain clay and argan oil for over a thousand years. Single ingredient. Nothing added. Skin properly fed.</div>
```

- [ ] **Replace Turkey card body**

Find:
```jsx
<div className="cs-prov-body">The Kese mitt — hand-woven raw silk from Istanbul artisans. The original exfoliation tool of the Ottoman hamam. The rougher texture that does what softer tools can't.</div>
```

Replace with:
```jsx
<div className="cs-prov-body">The exfoliation step that goes further than the daily mitt. Istanbul artisans hand-weave raw silk Kese mitts for the Ottoman hamam tradition. The rougher resistance that does what softer tools can't.</div>
```

- [ ] **Verify in browser:** All 4 cards — read each opener. UK and Korea cards should feel like a problem statement. Morocco and Turkey cards should feel like a capability statement. All body text legible at 15px.

- [ ] **Commit**
```bash
git add web/src/pages/ComingSoon.jsx
git commit -m "feat: rewrite provenance card openers — outcome first, origin as proof"
```

---

## Task 5: Push and full review

- [ ] **Final visual check** — read the full page top to bottom. Verify the ladder flows: The Wrong (H1) → The Why (subhead) → The Proof (stats with framing line) → The Fix (provenance + ritual) → The Identity (subscription section).

- [ ] **Check legibility** — no text below 13px body / 11px labels. No combination of small size + uppercase + wide letter-spacing + low opacity.

- [ ] **Push**
```bash
git push
```
