# Mobile Home and Buy Performance — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve mobile repeat-visit loading for the homepage and preserve the already-good direct `/buy` experience by making hashed static assets browser-cacheable and preventing the below-the-fold Ritual carousel from initiating media work until it is near the viewport.

**Architecture:** Amplify Hosting will send a long-lived immutable cache policy only for Vite’s fingerprinted `/assets/*` output. `RitualInAction` will separate *section proximity*, *carousel-card proximity*, and *playback visibility*: it will render a fixed media shell initially, create a card’s video or image only when that card is eligible, and retain the existing active-card/pause/play behaviour once media exists.

**Tech Stack:** React 19, Vite 8, AWS Amplify Hosting, Playwright, Vitest, Node.js.

## Global Constraints

- Work in `/Users/harshamahadeva/NewCo/solum` on `dev`; do not stage or modify `web/test-results/.last-run.json`.
- Do not change `web/src/pages/BuyPage.jsx`, payment behaviour, Stripe loading, analytics, pixels, session replay, or `web/index.html` in this phase.
- Cache only content-addressed Vite assets. Do not make HTML, `/video/*`, `/products/*`, or fonts immutable.
- Do not change the mobile or desktop visual hierarchy, carousel controls, keyboard support, reduced-motion behaviour, or progress events.
- Treat the 2026-07-24 baseline as the comparison point: homepage mobile p90 LCP 3,264 ms; `/buy` mobile p90 LCP 2,186 ms; homepage mobile p90 INP 137 ms.
- Keep commits focused: one for cache configuration, one for carousel behaviour and its regression test. Do not push or deploy unless explicitly requested.

---

## File Map

| File | Change |
| --- | --- |
| `customHttp.yml` | New Amplify custom-header configuration at the repository root. |
| `web/e2e/ritual-media.spec.ts` | New mobile browser regression coverage for deferred Ritual media and keyboard carousel operation. |
| `web/src/components/RitualInAction.jsx` | Gate media creation by section/card proximity while preserving the existing carousel state machine. |

## Task 1: Cache fingerprinted Vite assets in browsers

**Files:**

- Create: `customHttp.yml`

- [ ] Write the failing configuration contract before adding the file. From the repository root, run:

  ```bash
  node --input-type=module -e "import { readFile } from 'node:fs/promises'; const text = await readFile('customHttp.yml', 'utf8'); if (!text.includes(\"pattern: '/assets/*'\") || !text.includes('key: Cache-Control') || !text.includes('value: public, max-age=31536000, immutable') || text.includes(\"pattern: '**/*'\")) throw new Error('custom asset cache policy is missing or too broad');"
  ```

  Expected result: failure because `customHttp.yml` does not yet exist.

- [ ] Create `customHttp.yml` exactly as follows. The `/assets/*` path is Vite’s content-hashed build output, so a browser can safely retain it for a year; route documents and non-hashed media receive no new policy.

  ```yaml
  customHeaders:
    - pattern: '/assets/*'
      headers:
        - key: Cache-Control
          value: public, max-age=31536000, immutable
  ```

- [ ] Re-run the Node contract above; it must pass. Then build the web app to confirm the hosting configuration is additive and the production bundle still builds:

  ```bash
  npm --prefix web run build
  ```

- [ ] Inspect the diff and commit only the new configuration:

  ```bash
  git diff --check
  git add customHttp.yml
  git commit -m "perf: cache fingerprinted static assets"
  ```

## Task 2: Add a mobile regression test for deferred Ritual media

**Files:**

- Create: `web/e2e/ritual-media.spec.ts`

- [ ] Add the following Playwright test before changing the component. It expresses the customer-visible contract: there are no Ritual video elements while the section is distant; once the section is brought into view, the active video is created with its poster; the carousel remains operable with the keyboard.

  ```ts
  import { expect, test } from '@playwright/test';

  test.describe('Ritual carousel media', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('defers media until the section is near the mobile viewport', async ({ page }) => {
      await page.goto('/');

      const ritual = page.locator('#ritual');
      await expect(ritual.locator('video')).toHaveCount(0);

      await ritual.scrollIntoViewIfNeeded();

      const activeCard = ritual.locator('.ria-card.active');
      const activeVideo = activeCard.locator('video');
      await expect(activeVideo).toHaveCount(1);
      await expect(activeVideo).toHaveAttribute('poster', /.+/);

      const bodyWash = ritual.getByRole('button', { name: 'Play Body Wash' });
      await bodyWash.press('Enter');
      await expect(bodyWash).toHaveClass(/active/);
    });
  });
  ```

- [ ] Run the focused test against the current implementation:

  ```bash
  npm --prefix web exec playwright test e2e/ritual-media.spec.ts
  ```

  Expected result: failure at `toHaveCount(0)`, because today every video-backed Ritual card is mounted on initial page render.

## Task 3: Gate Ritual media creation without changing carousel behaviour

**Files:**

- Modify: `web/src/components/RitualInAction.jsx`

- [ ] Add immutable proximity constants next to `REDUCE_MOTION`:

  ```jsx
  const MEDIA_PRELOAD_MARGIN = '600px 0px';
  const CAROUSEL_MEDIA_MARGIN = '0px 160px';
  ```

- [ ] Add these component states and helper next to the existing carousel state. `loadedMedia` is intentionally monotonic: once a nearby card has created its media, do not tear it down during a swipe.

  ```jsx
  const [mediaActivated, setMediaActivated] = useState(false);
  const [loadedMedia, setLoadedMedia] = useState(() => new Set());

  const loadMedia = useCallback((idx) => {
    setLoadedMedia((previous) => (
      previous.has(idx) ? previous : new Set(previous).add(idx)
    ));
  }, []);
  ```

- [ ] Add a one-shot `IntersectionObserver` for `sectionRef`. Use `rootMargin: MEDIA_PRELOAD_MARGIN` and `threshold: 0`; when it intersects, set `mediaActivated` to `true` and disconnect it. This observer is separate from the current `threshold: 0.4` observer, which must continue to control only playback/pause visibility.

- [ ] When `mediaActivated` becomes true, call `loadMedia(activeIdxRef.current)` so the initially active card has media before the user reaches the section. Add a second observer rooted at `carouselRef.current`, with `rootMargin: CAROUSEL_MEDIA_MARGIN` and `threshold: 0`, to call `loadMedia(Number(entry.target.dataset.idx))` for horizontally nearby cards. Observe the existing `cardRefs` and disconnect during cleanup.

- [ ] Update `settle` and the explicit card-selection path (`goTo`/`promote`, as appropriate to the current component) so they call `loadMedia(index)` only after `mediaActivated` is true. Include `mediaActivated` and `loadMedia` in the relevant callback dependency arrays. This prevents the first initialization pass from accidentally defeating deferral, while ensuring a newly selected card is available promptly.

- [ ] Add a small effect that, after `mediaActivated` or `loadedMedia` changes, retries playback of the active video only when `inView.current` is true and `REDUCE_MOTION` is false. Use the existing muted `play().catch(() => {})` pattern. This closes the timing gap where the visibility observer fires before the video element has been created.

- [ ] In the `STEPS.map` render branch, calculate `const mediaReady = mediaActivated && loadedMedia.has(i)`. Preserve the existing `<video>` markup, `poster`, `preload="none"`, event handlers, and lazy `<img>` markup when `mediaReady` is true. When it is false, render only a fixed, `aria-hidden` media shell using the existing `.ria-media` sizing class:

  ```jsx
  {mediaReady && vid ? (
    <video /* retain the existing props and source */ />
  ) : mediaReady ? (
    <img /* retain the existing props */ />
  ) : (
    <div className="ria-media" aria-hidden="true" />
  )}
  ```

  Keep the cue, overlay, controls, card dimensions, and card `role="button"` outside this branch. Do not add a poster `<img>` to the deferred shell: loading that poster is exactly the work this change postpones.

- [ ] Run the regression test from Task 2. It must now pass:

  ```bash
  npm --prefix web exec playwright test e2e/ritual-media.spec.ts
  ```

- [ ] Run adjacent browser coverage and unit tests, then commit only the component and its new test:

  ```bash
  npm --prefix web exec playwright test e2e/product-lineup.spec.ts e2e/ritual-media.spec.ts
  npm --prefix web run test:unit
  git diff --check
  git add web/src/components/RitualInAction.jsx web/e2e/ritual-media.spec.ts
  git commit -m "perf: defer ritual carousel media"
  ```

## Task 4: Verify the complete change before a production rollout

**Files:**

- Verify only; do not expand scope unless a regression is found.

- [ ] Build and run the full web test suite from a clean working tree (aside from the known untracked/generated `web/test-results/.last-run.json`):

  ```bash
  npm --prefix web run build
  npm --prefix web run test:unit
  npm --prefix web exec playwright test
  git status --short
  ```

- [ ] Perform a 390 × 844 mobile visual check locally for `/` and `/buy?kit=ground`. On `/`, verify that the Ritual shell keeps its current dimensions before media loads, that the active video begins when the section enters view, that swiping/card keyboard selection still works, and that reduced-motion behaviour remains static. On `/buy`, verify accelerated checkout and the regular payment form are unchanged.

- [ ] After an explicitly approved production deployment, verify the emitted cache policy using a real current hashed asset rather than guessing a filename:

  ```bash
  asset_path=$(curl -fsSL https://bysolum.co.uk/ | perl -ne 'print "$1\\n" if m{<script type="module" crossorigin src="(/assets/index-[^"]+\\.js)">}')
  test -n "$asset_path"
  curl -fsSI --compressed "https://bysolum.co.uk${asset_path}" | rg -i '^cache-control:'
  curl -fsSI --compressed https://bysolum.co.uk/ | rg -i '^cache-control:'
  ```

  Success condition: the fingerprinted asset returns `public, max-age=31536000, immutable`; the document is not newly marked immutable.

- [ ] Measure the released experience after **both** seven days and 500 eligible mobile homepage Web Vitals events have elapsed. In PostHog, filter out test/synthetic traffic and compare the same mobile route segments with the baseline:

  - `/`: p90 LCP is at most 2,500 ms or at least 15% below 3,264 ms, with no median-LCP regression.
  - `/buy`: p90 LCP is at most 2,500 ms and median LCP is no worse than 1,140 ms.
  - Both routes retain p90 INP below 200 ms.

  If any guardrail regresses, retain the asset cache policy and revert only the carousel commit while investigating the exact route/device segment. Do not start Stripe deferral, route splitting, pixel changes, or video re-encoding under this plan.

## Execution Notes

- AWS Amplify reads repository-root custom headers from `customHttp.yml`; the narrow asset pattern follows its documented custom-header configuration format. [AWS Amplify custom headers documentation](https://docs.aws.amazon.com/amplify/latest/userguide/custom-headers.html)
- The deployment verification is deliberately a release check, not a local test: a local Vite server cannot prove the CDN’s final response headers.
- The test creates no dependency on media playback itself, which is subject to browser autoplay policy. It instead asserts DOM creation, poster availability, and keyboard navigation—the stable behaviour this change owns.
