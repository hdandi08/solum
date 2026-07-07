# Perf Round 2: Safe Wins + Invisible-Bounce Beacon — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the remaining low-risk critical-path costs on bysolum.co.uk (fonts, PostHog extras, oversized images) and add an `early_hit` beacon that measures paid clicks abandoning before the app bundle boots.

**Architecture:** All changes are front-end only, in `web/`. Fonts move from Google Fonts to self-hosted woff2 with inline `@font-face`. PostHog init stays untouched except two flags + a deferred `startSessionRecording()`. Images become right-sized WebP. The beacon is an inline `<head>` snippet posting directly to PostHog's ingestion endpoint before any other resource loads.

**Tech Stack:** Vite (rolldown) + React 18, PostHog JS (`posthog-js`), ffmpeg/cwebp for image conversion, Playwright for verification.

**Spec:** `docs/superpowers/specs/2026-07-07-perf-safe-wins-design.md`

## Global Constraints

- Work on the `dev` branch only; merge to `master` requires Harsha's explicit sign-off.
- Do NOT change PostHog init timing, `capture_pageview: 'history_change'`, or `capture_pageleave: true`.
- Hero stays video on mobile (locked decision 2026-07-07) — no hero changes in this round.
- Recorder deferral: window load OR 4s after init, whichever first (spec §2).
- PostHog public project token (safe to inline, already public in bundle): `phc_BjezQwNmSiTGyXYzg3nJNsRbGHBLi9qnCYN8YbHo8oEc`
- PostHog ingestion host: `https://eu.i.posthog.com` — beacon endpoint `/i/v0/e/`.
- Beacon + pixels fire only when `location.hostname.includes('bysolum')`.
- Personal API key for analysis scripts: `source .env.posthog` (repo root, gitignored) → `$PH`, project id `166881`.

---

### Task 1: Self-hosted fonts

**Files:**
- Create: `web/public/fonts/bebas-neue-400.woff2`, `web/public/fonts/barlow-condensed-{300,400,500,600,700}.woff2`, `web/public/fonts/barlow-condensed-300italic.woff2`
- Modify: `web/index.html` (lines ~62–64: the two `preconnect` links + the `fonts.googleapis.com/css2` stylesheet link)

**Interfaces:**
- Produces: `/fonts/*.woff2` URL paths used by the inline `@font-face` block; later tasks assume Google Fonts is gone from `index.html`.

- [ ] **Step 1: Download the latin-subset woff2 files from Google Fonts**

Google serves woff2 only to modern UAs. Fetch the CSS with a Chrome UA, extract latin-subset URLs, download:

```bash
cd /Users/harshamahadeva/NewCo/solum/web/public && mkdir -p fonts && cd fonts
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap" -o /tmp/gf.css
# The CSS contains one @font-face per (family,style,weight,subset). Extract the *latin* block URL for each combo:
python3 - <<'EOF'
import re, subprocess, pathlib
css = open('/tmp/gf.css').read()
blocks = re.findall(r'/\* (\w[\w-]*) \*/\s*@font-face\s*{([^}]+)}', css)
wanted = {}
for subset, body in blocks:
    if subset != 'latin': continue
    fam = re.search(r"font-family: '([^']+)'", body).group(1)
    style = re.search(r"font-style: (\w+)", body).group(1)
    weight = re.search(r"font-weight: (\d+)", body).group(1)
    url = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)
    slug = fam.lower().replace(' ', '-') + '-' + weight + ('italic' if style == 'italic' else '')
    wanted[slug] = url
for slug, url in wanted.items():
    out = f"{slug}.woff2"
    subprocess.run(['curl', '-s', url, '-o', out], check=True)
    print(out, pathlib.Path(out).stat().st_size)
EOF
ls -la *.woff2
```

Expected: 7 files (`bebas-neue-400`, `barlow-condensed-300/400/500/600/700`, `barlow-condensed-300italic`), each roughly 15–30KB.

- [ ] **Step 2: Replace Google Fonts tags in `web/index.html`**

Remove these three lines:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap" rel="stylesheet">
```

Replace with (preload the two above-the-fold fonts, inline all @font-face; unicode-range from Google's latin subset):

```html
<link rel="preload" href="/fonts/bebas-neue-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/barlow-condensed-300.woff2" as="font" type="font/woff2" crossorigin>
<style>
  @font-face{font-family:'Bebas Neue';font-style:normal;font-weight:400;font-display:swap;src:url(/fonts/bebas-neue-400.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
  @font-face{font-family:'Barlow Condensed';font-style:normal;font-weight:300;font-display:swap;src:url(/fonts/barlow-condensed-300.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
  @font-face{font-family:'Barlow Condensed';font-style:italic;font-weight:300;font-display:swap;src:url(/fonts/barlow-condensed-300italic.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
  @font-face{font-family:'Barlow Condensed';font-style:normal;font-weight:400;font-display:swap;src:url(/fonts/barlow-condensed-400.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
  @font-face{font-family:'Barlow Condensed';font-style:normal;font-weight:500;font-display:swap;src:url(/fonts/barlow-condensed-500.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
  @font-face{font-family:'Barlow Condensed';font-style:normal;font-weight:600;font-display:swap;src:url(/fonts/barlow-condensed-600.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
  @font-face{font-family:'Barlow Condensed';font-style:normal;font-weight:700;font-display:swap;src:url(/fonts/barlow-condensed-700.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
</style>
```

- [ ] **Step 3: Verify — build and check rendering**

```bash
cd /Users/harshamahadeva/NewCo/solum/web && npm run build && npm run preview -- --port 4173 --strictPort &
sleep 3
curl -s http://localhost:4173/ | grep -c "fonts.googleapis"   # expected: 0
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4173/fonts/bebas-neue-400.woff2  # expected: 200
```

Then screenshot check (fonts render, £ sign correct on /buy):

```bash
cd /Users/harshamahadeva/NewCo/solum/web && node -e "
const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:390,height:844}});
  await p.goto('http://localhost:4173/', {waitUntil:'networkidle'});
  await p.screenshot({path:'/tmp/fonts-home.png'});
  await p.goto('http://localhost:4173/buy', {waitUntil:'networkidle'});
  await p.screenshot({path:'/tmp/fonts-buy.png'});
  await b.close();
})()"
```

Read both screenshots — Bebas Neue headline and Barlow body must render (not fallback sans), £ signs intact.

- [ ] **Step 4: Commit**

```bash
cd /Users/harshamahadeva/NewCo/solum
git add web/public/fonts web/index.html
git commit -m "perf(fonts): self-host Bebas Neue + Barlow Condensed, drop Google Fonts render-blocking CSS"
```

---

### Task 2: PostHog diet — no surveys, deferred session recorder

**Files:**
- Modify: `web/src/lib/analytics.js` (the `posthog.init` options object inside `initAnalytics()`, ~lines 30–45)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: unchanged public API (`initAnalytics`, `capture`, …) — no caller changes.

- [ ] **Step 1: Edit `posthog.init` options and add deferred recorder start**

In `initAnalytics()`, add two flags to the `posthog.init` options object (keep every existing option exactly as-is):

```js
  posthog.init(KEY, {
    api_host: HOST,
    ui_host: 'https://eu.posthog.com',
    autocapture: true,
    capture_pageview: 'history_change',
    capture_pageleave: true,
    person_profiles: 'identified_only',
    // Surveys: none configured — skip the surveys.js fetch entirely.
    disable_surveys: true,
    // Recorder (52KB) stays off the first-paint path; started below at
    // window load or 4s, whichever comes first. Sessions shorter than that
    // get no replay (accepted trade-off, spec 2026-07-07).
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: { password: true, creditCard: true },
    },
    persistence: 'localStorage',
    ...(bootstrap ? { bootstrap } : {}),
  });
```

Immediately after the `posthog.register({ in_app_browser: ... })` call, add:

```js
  // Start the session recorder off the critical path: window load or 4s,
  // whichever comes first (load can fire late on slow phones — it waits on
  // every image — and we still want a replay for any session worth watching).
  let recorderStarted = false;
  const startRecorder = () => {
    if (recorderStarted) return;
    recorderStarted = true;
    posthog.startSessionRecording();
  };
  window.addEventListener('load', startRecorder, { once: true });
  setTimeout(startRecorder, 4000);
```

- [ ] **Step 2: Verify — recorder starts, surveys never fetched**

```bash
cd /Users/harshamahadeva/NewCo/solum/web && npm run build && node -e "
const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const reqs = [];
  p.on('request', r => reqs.push(r.url()));
  await p.goto('http://localhost:4173/', {waitUntil:'load'});
  await p.waitForTimeout(6000);
  console.log('surveys.js fetched:', reqs.some(u => u.includes('surveys')));      // expect false
  console.log('recorder fetched:',  reqs.some(u => u.includes('recorder')));      // expect true
  await b.close();
})()"
```

Note: PostHog inits on localhost (only pixels are hostname-gated), so this works against preview.
Expected: `surveys.js fetched: false`, `recorder fetched: true`.

- [ ] **Step 3: Commit**

```bash
cd /Users/harshamahadeva/NewCo/solum
git add web/src/lib/analytics.js
git commit -m "perf(posthog): disable unused surveys, defer session recorder to load/4s"
```

---

### Task 3: Image slimming + hero poster preload

**Files:**
- Create: `web/public/icons/*.webp` (9 files), `web/public/harsha.webp`
- Delete: `web/public/icons/*.png` (9 files), `web/public/harsha.jpg`
- Modify: `web/src/components/ProblemSection.jsx` (icon paths in data array, ~lines 26–31), `web/src/components/WhatSolumIs.jsx` (pillar `ic:` paths, ~lines 34–36), `web/src/components/FounderSection.jsx` (photo src, ~line 21), `web/src/components/FounderChat.jsx` (avatar srcs, ~lines 279 + 349), `web/index.html` (add poster preload)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: new public asset paths `/icons/<name>.webp`, `/harsha.webp`.

- [ ] **Step 1: Convert icons (display 48px → encode 144px) and founder photo (max 288px)**

```bash
cd /Users/harshamahadeva/NewCo/solum/web/public
for f in icons/*.png; do
  ffmpeg -y -hide_banner -loglevel error -i "$f" -vf "scale=144:-1" -c:v libwebp -quality 82 "${f%.png}.webp"
done
ffmpeg -y -hide_banner -loglevel error -i harsha.jpg -vf "scale=288:-1" -c:v libwebp -quality 82 harsha.webp
ls -la icons/*.webp harsha.webp
```

Expected: each webp ≤ 10KB (vs 15–86KB PNGs), harsha.webp ≈ 10–25KB.

- [ ] **Step 2: Point components at the .webp paths**

- `ProblemSection.jsx` data array: replace all six `'/icons/problem-<x>.png'` with `'/icons/problem-<x>.webp'`.
- `WhatSolumIs.jsx`: replace all three `'/icons/pillar-<x>.png'` with `'/icons/pillar-<x>.webp'`.
- `FounderSection.jsx` line ~21: `src="/harsha.jpg"` → `src="/harsha.webp"`.
- `FounderChat.jsx` lines ~279 and ~349: `src="/harsha.jpg"` → `src="/harsha.webp"`.

Then confirm nothing else references the old files before deleting:

```bash
cd /Users/harshamahadeva/NewCo/solum/web && grep -rn "harsha.jpg\|icons/problem-.*png\|icons/pillar-.*png" src/ index.html public/ --include="*.jsx" --include="*.js" --include="*.html" --include="*.css"
```

Expected: no matches. Then:

```bash
cd /Users/harshamahadeva/NewCo/solum/web/public && git rm -q icons/*.png && git rm -q harsha.jpg
```

If the grep DOES match somewhere else (e.g. email templates under `public/email/`), leave the original file in place for that consumer and skip its deletion — email HTML must keep absolute stable assets.

- [ ] **Step 3: Add hero poster preload to `web/index.html`**

Immediately after the font preloads from Task 1, add:

```html
<link rel="preload" href="/video/banner-poster.jpg" as="image" fetchpriority="high">
```

- [ ] **Step 4: Verify — build + visual check**

```bash
cd /Users/harshamahadeva/NewCo/solum/web && npm run build && node -e "
const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:390,height:844}});
  const fails = [];
  p.on('response', r => { if (r.status() >= 400) fails.push(r.url()); });
  await p.goto('http://localhost:4173/', {waitUntil:'networkidle'});
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(2000);
  console.log('4xx/5xx responses:', fails);
  await p.screenshot({path:'/tmp/webp-full.png', fullPage:true});
  await b.close();
})()"
```

Expected: `4xx/5xx responses: []`. Read `/tmp/webp-full.png` — icons and founder photo render crisply.

- [ ] **Step 5: Commit**

```bash
cd /Users/harshamahadeva/NewCo/solum
git add -A web/public web/src/components/ProblemSection.jsx web/src/components/WhatSolumIs.jsx web/src/components/FounderSection.jsx web/src/components/FounderChat.jsx web/index.html
git commit -m "perf(images): right-sized WebP icons + founder photo, preload hero poster"
```

---

### Task 4: Invisible-bounce beacon + analysis script

**Files:**
- Modify: `web/index.html` (new inline script as the FIRST element inside `<head>` after `<meta charset>`)
- Create: `scripts/posthog/invisible_bounce.py`

**Interfaces:**
- Produces: PostHog event `early_hit` with properties `path`, `utm_source`, `utm_campaign`, `referrer`, `screen_width`; analysis via `PH=… python3 scripts/posthog/invisible_bounce.py`.

- [ ] **Step 1: Add the beacon snippet to `web/index.html`**

Place directly after `<meta charset="UTF-8" />` (it must beat every other fetch; prod-gated like the pixels):

```html
    <!-- Invisible-bounce beacon: fires before ANY other resource so we can count
         visitors who abandon before the app bundle boots (early_hit vs $pageview).
         Deliberately person-agnostic: random id, no cookies. Spec 2026-07-07. -->
    <script>
      if(location.hostname.includes('bysolum')){
        try{
          var q=new URLSearchParams(location.search);
          var payload=JSON.stringify({
            api_key:'phc_BjezQwNmSiTGyXYzg3nJNsRbGHBLi9qnCYN8YbHo8oEc',
            event:'early_hit',
            distinct_id:'early-'+Math.random().toString(36).slice(2),
            properties:{
              path:location.pathname,
              utm_source:q.get('utm_source')||'',
              utm_campaign:q.get('utm_campaign')||'',
              referrer:document.referrer||'',
              screen_width:screen.width,
              $process_person_profile:false
            },
            timestamp:new Date().toISOString()
          });
          if(!(navigator.sendBeacon&&navigator.sendBeacon('https://eu.i.posthog.com/i/v0/e/',payload))){
            fetch('https://eu.i.posthog.com/i/v0/e/',{method:'POST',body:payload,keepalive:true,headers:{'Content-Type':'application/json'}});
          }
        }catch(e){}
      }
    </script>
```

- [ ] **Step 2: Verify the payload is accepted by PostHog ingestion**

The site only beacons on prod hostname, so test the endpoint directly:

```bash
curl -s -X POST 'https://eu.i.posthog.com/i/v0/e/' -H 'Content-Type: application/json' -d '{
  "api_key":"phc_BjezQwNmSiTGyXYzg3nJNsRbGHBLi9qnCYN8YbHo8oEc",
  "event":"early_hit_test",
  "distinct_id":"early-plan-test",
  "properties":{"path":"/plan-test","$process_person_profile":false}
}'
```

Expected: `{"status": 1}` (or `{"status":"Ok"}`). Then confirm arrival (can lag ~1 min):

```bash
sleep 60 && source /Users/harshamahadeva/NewCo/solum/.env.posthog && python3 -c "
import os,json,ssl,urllib.request
ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
r=urllib.request.Request('https://eu.posthog.com/api/projects/166881/query/',
  data=json.dumps({'query':{'kind':'HogQLQuery','query':\"SELECT count() FROM events WHERE event='early_hit_test' AND timestamp>=now()-INTERVAL 1 HOUR\"}}).encode(),
  headers={'Authorization':'Bearer '+os.environ['PH'],'Content-Type':'application/json'},method='POST')
print(json.load(urllib.request.urlopen(r,context=ctx))['results'])"
```

Expected: `[[1]]` (or more if retried).

- [ ] **Step 3: Write `scripts/posthog/invisible_bounce.py`**

```python
#!/usr/bin/env python3
"""Invisible-bounce rate: visitors whose HTML arrived (early_hit) but whose app
bundle never booted (no $pageview). Split by ad vs organic and device class.

Usage: source .env.posthog && PH=$PH python3 scripts/posthog/invisible_bounce.py
"""
import os, json, ssl, urllib.request

SSL = ssl.create_default_context()
SSL.check_hostname = False
SSL.verify_mode = ssl.CERT_NONE

PH  = os.environ["PH"]
PID = os.environ.get("PID", "166881")
BASE = f"https://eu.posthog.com/api/projects/{PID}"
PROD = "properties.$host NOT LIKE '%localhost%' AND properties.$host NOT LIKE '%amplifyapp%'"

def q(hogql):
    req = urllib.request.Request(
        f"{BASE}/query/",
        data=json.dumps({"query": {"kind": "HogQLQuery", "query": hogql}}).encode(),
        headers={"Authorization": f"Bearer {PH}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, context=SSL) as r:
        return json.load(r)["results"]

print("=== early_hit vs $pageview per day (last 14 days) ===")
print(f"{'day':<12}{'src':<10}{'device':<9}{'early_hit':>10}{'pageview':>10}{'lost':>7}{'lost%':>7}")
rows = q(f"""
SELECT day, src, device, sumIf(n, event='early_hit') AS hits, sumIf(n, event='$pageview') AS views
FROM (
  SELECT toDate(timestamp) AS day,
         if(coalesce(properties.utm_source,'')!='', 'ad', 'organic') AS src,
         multiIf(event='early_hit' AND toInt64OrNull(toString(properties.screen_width)) <= 767, 'mobile',
                 event='early_hit', 'desktop',
                 properties.$device_type='Mobile', 'mobile', 'desktop') AS device,
         event, count() AS n
  FROM events
  WHERE event IN ('early_hit','$pageview')
    AND timestamp >= now() - INTERVAL 14 DAY
    AND (event='early_hit' OR ({PROD}))
  GROUP BY day, src, device, event
)
GROUP BY day, src, device ORDER BY day DESC, src, device
""")
for day, src, device, hits, views in rows:
    lost = max(hits - views, 0)
    pct = f"{lost/hits*100:5.1f}%" if hits else "    —"
    print(f"{str(day):<12}{src:<10}{device:<9}{hits:>10}{views:>10}{lost:>7}{pct:>7}")

print("\nNote: $pageview counts SPA route changes too; compare homepage-path-only if it")
print("overshoots. early_hit has no bot filtering — expect a few % baseline 'loss' even")
print("on desktop organic; the signal is the DELTA between ad-mobile and that baseline.")
```

- [ ] **Step 4: Run the analysis script (will be near-empty until beacon deploys — just verify it executes)**

```bash
cd /Users/harshamahadeva/NewCo/solum && source .env.posthog && PH=$PH python3 scripts/posthog/invisible_bounce.py
```

Expected: header rows print, zero or near-zero data rows, no traceback.

- [ ] **Step 5: Commit**

```bash
cd /Users/harshamahadeva/NewCo/solum
git add web/index.html scripts/posthog/invisible_bounce.py
git commit -m "feat(analytics): pre-boot early_hit beacon + invisible-bounce analysis script"
```

---

### Task 5: Full verification + deploy handoff

**Files:**
- No new files; runs against the built app. Reuses the round-1 Playwright verify pattern.

**Interfaces:**
- Consumes: everything from Tasks 1–4.

- [ ] **Step 1: Rebuild + full Playwright functional pass**

```bash
cd /Users/harshamahadeva/NewCo/solum/web && npm run build
# preview server on 4173 (background), then:
node -e "
const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport:{width:390,height:844}});
  const reqs = []; const fails = [];
  p.on('request', r => reqs.push(r.url()));
  p.on('response', r => { if (r.status() >= 400) fails.push(r.url()); });
  await p.goto('http://localhost:4173/', {waitUntil:'load'});
  await p.waitForTimeout(6000);
  const t = await p.textContent('body');
  const checks = {
    'homepage renders': t.length > 500,
    'no Google Fonts': !reqs.some(u => u.includes('fonts.g')),
    'no Stripe on home': !reqs.some(u => u.includes('js.stripe.com')),
    'no surveys.js': !reqs.some(u => u.includes('surveys')),
    'recorder loaded (<=4s+load)': reqs.some(u => u.includes('recorder')),
    'webp icons served': reqs.some(u => u.includes('/icons/') && u.includes('.webp')),
    'no 4xx/5xx': fails.length === 0,
  };
  for (const [k,v] of Object.entries(checks)) console.log(v ? 'PASS' : 'FAIL', k);
  const buy = await b.newPage(); const breqs = [];
  buy.on('request', r => breqs.push(r.url()));
  await buy.goto('http://localhost:4173/buy', {waitUntil:'load'});
  await buy.waitForTimeout(3000);
  console.log(breqs.some(u=>u.includes('js.stripe.com')) ? 'PASS' : 'FAIL', '/buy loads Stripe');
  await b.close();
})()"
```

Expected: all PASS. (Beacon is prod-gated so it will not appear here — verified in Task 4 Step 2 and post-deploy.)

- [ ] **Step 2: Local Lighthouse comparison**

```bash
cd /private/tmp/claude-501/-Users-harshamahadeva-NewCo-solum/15edc57a-e9fa-4190-877c-7645857889c6/scratchpad
npx -y lighthouse http://localhost:4173/ --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --only-categories=performance --output=json --output-path=./lh-local-round2.json --chrome-flags="--headless=new" --quiet
```

Compare against round-1 local (60): expect ≥ 65. If lower, inspect `audits['render-blocking-resources']` and `network-requests` before proceeding.

- [ ] **Step 3: Push dev, hand to Harsha**

```bash
cd /Users/harshamahadeva/NewCo/solum && git push origin dev
```

Report results; Harsha tests on https://dev.d3pa095gzazg3c.amplifyapp.com. **STOP — master merge needs his sign-off.**

- [ ] **Step 4 (post-sign-off): merge, deploy, re-measure prod**

```bash
cd /Users/harshamahadeva/NewCo/solum
git checkout master && git pull origin master --ff-only && git merge dev --no-edit && git push origin master && git checkout dev
# wait for Amplify SUCCEED on master (app d3pa095gzazg3c), then:
cd /private/tmp/claude-501/-Users-harshamahadeva-NewCo-solum/15edc57a-e9fa-4190-877c-7645857889c6/scratchpad
npx -y lighthouse https://bysolum.co.uk/ --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --only-categories=performance --output=json --output-path=./lh-prod-round2.json --chrome-flags="--headless=new" --quiet
```

Post-deploy checks: `early_hit` events arriving (`invisible_bounce.py`), a session replay appears in PostHog for a fresh prod visit, fonts render on the live site.
Once a day of ad traffic has accrued: ask Harsha for that day's Meta Ads Manager link-click count and sanity-check it against the ad-tagged `early_hit` count (spec §4).
