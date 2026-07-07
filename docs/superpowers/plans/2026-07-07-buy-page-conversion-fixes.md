# /buy Conversion Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the /buy landing moment for cold catalog-ad traffic — CTA and product visual above the fold, preselected kit first, IAB banner off the first paint, ladder-compliant headline — plus two SPA boot fixes (body background, branded Suspense fallback).

**Architecture:** All changes live in the existing `web/` React SPA. BuyPage's details-step render is restructured (kit cards, intro copy, back-link gating, scroll-to-form CTA); `BuyMobileHeader` gains a CTA slot; `InAppBrowserBanner` gains an `inline` variant; App.jsx/index.html get the boot fixes. No new routes, no data-model changes, no backend changes.

**Tech Stack:** React 18, Vite, checkout.css + component-inline CSS, Playwright for verification.

## Global Constraints

- Work on the `dev` branch only; explicit user sign-off before any master merge.
- Preserve every existing `data-testid` used by `e2e/buy-flow.spec.ts`: `kit-selector`, `kit-ground`, `kit-ritual`, `details-form`, `first-name`, `email`, `phone`, `continue-btn`, `delivery-form`, `line1`, `city`, `postcode`, `delivery-btn`, `pay-btn`, `form-error`, `delivery-error`, `pay-error`. Kit cards must still contain the text `£65` / `£85`.
- Copy rules: no em/en/double dashes in customer-facing copy; price shown as one-time £65/£85; never the word "soap"; minimum font sizes 13px body / 11px labels; wordmark only via `/solum-wordmark-clean.svg` img tag, never text.
- Do not change the reviews data or make the 5/5 badge more prominent (placeholder reviews; real ones come from the founder later).
- Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Boot fixes — body background + branded Suspense fallback

**Files:**
- Modify: `web/index.html:138` (body tag)
- Modify: `web/src/App.jsx:52` (Suspense fallback) + add `RouteFallback` component

**Interfaces:**
- Produces: `RouteFallback()` — internal to App.jsx, no exports.

- [ ] **Step 1: Give `<body>` an inline background so slow connections never flash white**

In `web/index.html` change:

```html
  <body>
```

to:

```html
  <body style="background:#08090b">
```

- [ ] **Step 2: Add `RouteFallback` and use it as the Suspense fallback**

In `web/src/App.jsx`, above `AuthRedirectGuard`, add:

```jsx
// Shown while a lazy route chunk downloads. Direct ad landings on /buy used
// to sit on a blank screen here (fallback was null) — now they see the brand.
function RouteFallback() {
  return (
    <div style={{ minHeight: '100vh', background: '#08090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src="/solum-wordmark-clean.svg" alt="SOLUM" style={{ height: 22, opacity: 0.65 }} />
    </div>
  );
}
```

and change `<Suspense fallback={null}>` to `<Suspense fallback={<RouteFallback />}>`.

- [ ] **Step 3: Build to verify**

Run: `cd web && npm run build`
Expected: build succeeds, no lint/JSX errors.

- [ ] **Step 4: Commit**

```bash
git add web/index.html web/src/App.jsx
git commit -m "fix(buy): dark body background + branded route fallback (no white/blank flash on ad landings)"
```

### Task 2: Details-step fold restructure — copy, back-link gating, kit cards with photo + CTA

**Files:**
- Modify: `web/src/pages/BuyPage.jsx` (CSS block ~63–129, main render ~957–1140, payment render ~936)

**Interfaces:**
- Consumes: `KITS` (`kit.image`, `kit.outcome`, `kit.popular`, `kit.productNums`), `PRODUCTS` (`p.num`, `p.comingSoon`); `@600.webp` kit image variants exist in `web/public/products/kit/`.
- Produces: `formStartRef` (React ref on the express-checkout wrapper) and `scrollToForm()` — Task 3's sticky-bar CTA calls `scrollToForm`.

- [ ] **Step 1: Add direct-landing detection + scroll-to-form ref in `BuyPage()`**

Below `const isFirstBatch = source === 'first_batch';` add:

```jsx
  // React Router's history writes an idx into history.state; 0 means /buy is
  // the first entry in this tab (ad click / direct landing) — a "Back to kits"
  // link would point at a page the visitor has never seen.
  const isDirectLanding = (window.history.state?.idx ?? 0) === 0;

  // Kit CTAs and the sticky bar scroll here (express wallets + form).
  const formStartRef = useRef(null);
  const scrollToForm = () => formStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
```

- [ ] **Step 2: Gate both back-links**

Wrap the two `← Back to kits` anchors (payment render and main render) in `{!isDirectLanding && ( ... )}`.

- [ ] **Step 3: Rewrite the intro to ladder Layers 1→3**

Replace the `by-intro` block with:

```jsx
                <div className="by-intro">
                  <span className="by-intro-eyebrow">Men's Body Care</span>
                  <h1 className="by-intro-head">You shower every day. Your body still isn't properly clean.</h1>
                  <p className="by-intro-sub">One kit fixes it, head to toe. 10 minutes a day. We show you exactly how.</p>
                  <ReviewsBadge />
                </div>
```

- [ ] **Step 4: Rebuild the kit cards — preselected kit first, photo, outcome, contents count, CTA button**

Replace the kit-selector block with:

```jsx
              {step === 'details' && (
                <div className="by-kits" data-testid="kit-selector">
                  {(preselect === 'ground' ? ['ground', 'ritual'] : ['ritual', 'ground']).map((id, i) => {
                    const kit = KITS.find(k => k.id === id);
                    const contentsCount = PRODUCTS.filter(p => kit.productNums.includes(p.num) && !p.comingSoon).length;
                    return (
                      <div
                        key={id}
                        data-testid={`kit-${id}`}
                        className={`by-kit${selectedKit === id ? ' selected' : ''}`}
                        onClick={() => { setSelectedKit(id); trackAddToCart(id); }}
                      >
                        {kit?.popular && <span className="by-kit-badge">Most Popular</span>}
                        {kit?.image && (
                          <img
                            src={kit.image.replace('.webp', '@600.webp')}
                            alt={`${kit.name} kit contents`}
                            className="by-kit-img"
                            loading={i === 0 ? 'eager' : 'lazy'}
                            fetchpriority={i === 0 ? 'high' : undefined}
                          />
                        )}
                        <div className="by-kit-name">{kit?.name}</div>
                        <div className="by-kit-outcome">{kit?.outcome}</div>
                        <div className="by-kit-contents">{contentsCount} products in the box · {id === 'ritual' ? 'daily + weekly ritual' : 'the daily system'}</div>
                        <div className="by-kit-buyrow">
                          <div>
                            <div className="by-kit-price">£{KIT_PRICES[id]}</div>
                            <div className="by-kit-price-label">one-time</div>
                          </div>
                          <button
                            type="button"
                            className="by-kit-cta"
                            onClick={(e) => { e.stopPropagation(); setSelectedKit(id); trackAddToCart(id); capture('buy_kit_cta_clicked', { kit: id, source }); scrollToForm(); }}
                          >
                            Buy {kit?.name} →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
```

- [ ] **Step 5: Anchor the express wrap as the scroll target**

Add the ref to the express wrapper: `<div className="by-express-wrap" ref={formStartRef}>`.

- [ ] **Step 6: Update the inline CSS block**

In `CSS`: replace `.by-intro-head` rules and `.by-kit-tagline`, add new classes:

```css
.by-intro{margin-bottom:24px;}
.by-intro-eyebrow{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:700;display:block;margin-bottom:10px;}
.by-intro-head{font-size:26px;font-weight:600;color:var(--bone);line-height:1.25;margin:0 0 6px;max-width:540px;}
@media(max-width:768px){.by-intro-head{font-size:22px;}}
.by-intro-sub{font-size:15px;font-weight:300;color:var(--stone);line-height:1.5;max-width:520px;margin:0 0 4px;}
.by-kit-img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;margin-bottom:14px;background:var(--dark);}
.by-kit-outcome{font-size:16px;font-weight:500;color:var(--mist);line-height:1.35;margin-bottom:4px;}
.by-kit-contents{font-size:13px;font-weight:300;color:var(--stone);letter-spacing:.3px;margin-bottom:14px;}
.by-kit-buyrow{display:flex;align-items:center;justify-content:space-between;gap:12px;}
.by-kit-cta{font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:.08em;background:var(--blue);color:#fff;border:none;padding:13px 22px;cursor:pointer;transition:background .15s;}
.by-kit-cta:hover{background:var(--blit);}
```

Delete `.by-kit-tagline` (no longer rendered). Keep `.by-kit-name`, `.by-kit-price`, `.by-kit-price-label`, `.by-kit-badge` as they are.

- [ ] **Step 7: Build + visual check**

Run: `cd web && npm run build && npm run preview` then screenshot `http://localhost:4173/buy?kit=ritual` at 390×664. Expected: no back link, new H1, RITUAL card first with photo and a `Buy RITUAL →` button.

- [ ] **Step 8: Commit**

```bash
git add web/src/pages/BuyPage.jsx
git commit -m "feat(buy): fold restructure — ladder H1, preselected kit first with photo + CTA, back link hidden on direct landings"
```

### Task 3: Sticky bottom bar — compact + Buy CTA, no card overlap

**Files:**
- Modify: `web/src/pages/BuyPage.jsx` (`BuyMobileHeader`, `headerProps` call sites)
- Modify: `web/src/pages/checkout/checkout.css` (`.co-mobile-header-bar` block ~60–69, mobile media block ~1308–1330)

**Interfaces:**
- Consumes: `scrollToForm` from Task 2.
- Produces: `BuyMobileHeader({ ..., onCta })` — `onCta` present ⇒ render `Buy →` button in the bar.

- [ ] **Step 1: Restructure the bar so the toggle and the CTA are sibling buttons**

In `BuyMobileHeader`, change the signature to `function BuyMobileHeader({ kit, price, dispatch, arrival, inventory, onCta })` and replace the outer `<button className="co-mobile-header-bar">…</button>` with:

```jsx
      <div className="co-mobile-header-bar">
        <button
          className="co-mobile-header-info"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          type="button"
        >
          {kit.image && <img src={kit.image} alt="" className="co-mobile-hero-thumb" />}
          <div className="co-mobile-header-left">
            <span className="co-mobile-kit-name">{kit.name}</span>
            <span className="co-mobile-see-more">
              {open ? 'Hide summary' : "What's inside ›"}
            </span>
          </div>
          <div className="co-mobile-price-block">
            <span className="co-mobile-price">£{price}</span>
            <span className="co-mobile-price-note">one-time</span>
          </div>
        </button>
        {onCta && (
          <button type="button" className="co-mobile-cta" onClick={onCta}>
            Buy →
          </button>
        )}
      </div>
```

(The `kit.outcome` line and the round chevron are dropped from the bar — the bar shrinks to one line + hint; the sheet is unchanged.)

- [ ] **Step 2: CSS — split bar styles, add CTA, fix overlap padding**

In `checkout.css` replace the `.co-mobile-header-bar` rule with:

```css
.co-mobile-header-bar {
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 10px 12px;
}

.co-mobile-header-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  padding: 0;
}

.co-mobile-cta {
  flex-shrink: 0;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 17px;
  letter-spacing: 0.08em;
  background: var(--blue);
  color: #fff;
  border: none;
  padding: 0 20px;
  cursor: pointer;
}
```

In the mobile media block, change `.co-left` bottom padding `96px` → `112px`, and remove the now-stale `.co-mobile-header-bar { width: 100%; }` override.

- [ ] **Step 3: Wire `onCta` on the details step only**

In the main render: `<BuyMobileHeader {...headerProps} onCta={step === 'details' ? scrollToForm : undefined} />`. Payment render keeps `<BuyMobileHeader {...headerProps} />` (no CTA mid-payment).

- [ ] **Step 4: Build + visual check**

Run: `cd web && npm run build`; screenshot preview at 390×664. Expected: bar is one compact line with a blue `Buy →` button; bar no longer covers the second kit card; tapping the left side still opens the sheet.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/BuyPage.jsx web/src/pages/checkout/checkout.css
git commit -m "feat(buy): sticky bar becomes a CTA — compact one-line bar with Buy button, overlap fixed"
```

### Task 4: IAB banner off the landing fold — inline variant on the details step

**Files:**
- Modify: `web/src/components/InAppBrowserBanner.jsx`
- Modify: `web/src/components/InAppBrowserBanner.css`
- Modify: `web/src/pages/BuyPage.jsx` (main render banner placement)

**Interfaces:**
- Produces: `InAppBrowserBanner({ variant })` — `'fixed'` (default, unchanged) or `'inline'` (in-flow card, no --iab-h layout push, no dismiss button).

- [ ] **Step 1: Add the `variant` prop**

In `InAppBrowserBanner.jsx`: signature `export default function InAppBrowserBanner({ variant = 'fixed' })`; guard the layout effect with `if (!active || hidden || variant === 'inline') return undefined;`; pass `placement: variant` as an extra property on the `iab_banner_shown` and `iab_banner_clicked` captures; and before the fixed-bar return add:

```jsx
  if (variant === 'inline') {
    return (
      <>
        <div className="iab-inline">
          <button type="button" className="iab-inline-open" onClick={onOpen}>
            <span className="iab-banner-text">Prefer 1 tap {wallet}? Open in your browser</span>
            <span className="iab-banner-arrow" aria-hidden="true">&#8599;</span>
          </button>
        </div>
        {showOverlay && ( /* same overlay JSX as the fixed variant */ )}
      </>
    );
  }
```

(Extract the overlay JSX into a local variable so both variants share it verbatim.)

- [ ] **Step 2: CSS for the inline card**

Append to `InAppBrowserBanner.css`:

```css
.iab-inline {
  margin: 0 0 18px;
  border: 1px solid rgba(46, 109, 164, 0.35);
  background: rgba(46, 109, 164, 0.08);
}
.iab-inline-open {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  color: #F0ECE2;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
}
```

- [ ] **Step 3: Move the banner in BuyPage's main render**

In the main (details/delivery) return: change the top-level `<InAppBrowserBanner />` to `{step !== 'details' && <InAppBrowserBanner />}` and add `{step === 'details' && <InAppBrowserBanner variant="inline" />}` immediately above the `by-express-wrap` div (inside the details block). Payment and soldout renders keep the fixed banner unchanged.

- [ ] **Step 4: Build + visual check**

Run: `cd web && npm run build`; screenshot preview with Instagram UA. Expected: no blue bar at the top on landing; a slim inline "Prefer 1 tap Apple Pay?" card sits between the kit cards and the form.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/InAppBrowserBanner.jsx web/src/components/InAppBrowserBanner.css web/src/pages/BuyPage.jsx
git commit -m "feat(buy): IAB breakout demoted from first paint to inline card above the form"
```

### Task 5: Verification — fold re-capture + e2e testid sweep

**Files:**
- Test: scratchpad fold-capture script (rerun against local preview), `e2e/buy-flow.spec.ts` (grep only)

- [ ] **Step 1: Full build + preview + fold capture**

Run the audit's capture script against `http://localhost:4173/buy?kit=ritual` (iPhone 13 viewport, Instagram UA, `waitUntil: 'load'`). Expected at 664px fold: H1 + RITUAL card with image + `Buy RITUAL →` button all visible; no top banner; no back link; sticky bar compact with `Buy →`.

- [ ] **Step 2: Internal-nav regression**

In the same script, navigate `/` → tap through to `/buy` (or set history idx > 0) and confirm the back link renders for internal navigations. Also capture `/buy` with a desktop viewport to confirm the desktop layout is unbroken.

- [ ] **Step 3: testid sweep**

Run: `grep -o 'data-testid="[^"]*"' web/src/pages/BuyPage.jsx | sort -u` and confirm every id listed in Global Constraints is still present; confirm kit cards still contain £65/£85 text.

- [ ] **Step 4: Push dev**

```bash
git push origin dev
```

Then hand to Harsha for on-device testing; master merge only after sign-off.
