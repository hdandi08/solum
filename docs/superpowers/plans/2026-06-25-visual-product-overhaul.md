# Picture-First Website Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert SOLUM from a text-driven site to an image/video-led one — dedicated product pages with films + editorial stills, a banner-film hero, photo-dominant product cards, and real photography across `/buy` and `/ritual`.

**Architecture:** A media/content layer over the existing component architecture. Asset pipeline (Python/PIL for images committed to `/public`; ffmpeg for videos hosted on the existing CloudFront CDN) feeds an additive `media` field on each product in `products.js`. A new `/product/:slug` route renders editorial product pages; existing sections swap text blocks for imagery. No checkout/analytics/A-B changes.

**Tech Stack:** React 18 + Vite + react-router-dom, plain CSS-in-`<style>` blocks with CSS vars, Python/PIL (image build), ffmpeg (video transcode), CloudFront CDN, Playwright (e2e). No unit-test framework exists — automated checks are a Node integrity script + Playwright e2e; visual correctness is verified manually against the dev server.

## Global Constraints

- Region/infra unchanged; videos hosted on existing CDN `https://d2ni3owln6t6zz.cloudfront.net`.
- Brand rules (from CLAUDE.md): wordmark always uppercase; never the word "soap"; never orange/amber/yellow/green; colours from the locked palette (`--black #08090B`, `--char #181C24`, `--blue #2E6DA4`, `--bone #F0ECE2`, gold `#c8a96e`); always show country of origin; number products 01–08 style.
- Min font sizes: 13px body, 11px labels (user rule — illegible below).
- Logo: embed `/solum-wordmark-clean.svg` via `<img>`, never recreate as text.
- Work on `dev` branch only. Test locally (`cd web && npm run dev`, port 5173) before any commit. Push to prod only after explicit sign-off.
- Videos: `muted autoPlay loop playsInline preload="none"`, poster always set, honor `prefers-reduced-motion` (poster only, no autoplay). Never autoplay with sound.
- Images: explicit width/height, `loading="lazy"` except hero/LCP, descriptive `alt`, WebP with `@600` mobile variant in `srcset`.
- `media.video` / banner / unboxing URLs stay `null` (poster fallback) until the user uploads to CDN — code must render gracefully with `null`. Products 03 (Back Scrub Cloth) and 04 (Scalp Massager) have **no film** — stills only.
- Slugs are explicit per product (product `num` does not always match filename, e.g. Clay Mixing Bowl is `num:'11'` but file `09-mixing-bowl.png`). Never derive slug from `num`.

**Source assets (local, not in repo):**
- Photos: `~/Downloads/solum-photo-download-1of1/Highlights/SOCO_SOLUM_SE-<n>.jpg`
- Films: `~/Downloads/drive-download-20260625T092428Z-3-001/SOLUM - <NAME>.mp4`

---

### Task 1: Product data model — slugs + media, with integrity check

**Files:**
- Create: `web/scripts/check-product-media.mjs`
- Modify: `web/src/data/products.js` (every product object)

**Interfaces:**
- Produces: each product gains `slug: string` (unique, kebab) and
  `media: { still, stillMobile, gallery: string[], poster, video }` where every value is a
  `/products/<NN>/...` path string or `null`. Active (non-`comingSoon`) products have non-null
  `slug` and `media.still`. Consumed by Tasks 2,4,5,8.

- [ ] **Step 1: Write the failing integrity check**

Create `web/scripts/check-product-media.mjs`:

```js
import { PRODUCTS } from '../src/data/products.js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const CHECK_FILES = process.argv.includes('--files'); // file-existence checked after images built
let errors = [];

const slugs = new Set();
for (const p of PRODUCTS) {
  if (!p.slug) { errors.push(`${p.num} ${p.name}: missing slug`); continue; }
  if (slugs.has(p.slug)) errors.push(`${p.num}: duplicate slug ${p.slug}`);
  slugs.add(p.slug);
  if (!/^[a-z0-9-]+$/.test(p.slug)) errors.push(`${p.num}: slug not kebab-case: ${p.slug}`);
  if (!p.media) { errors.push(`${p.num}: missing media`); continue; }
  if (!p.comingSoon && !p.media.still) errors.push(`${p.num}: active product missing media.still`);
  if (!CHECK_FILES) continue;
  for (const f of [p.media.still, p.media.stillMobile, p.media.poster, ...(p.media.gallery || [])]) {
    if (f && !existsSync(join(PUBLIC, f))) errors.push(`${p.num}: missing file ${f}`);
  }
}
if (errors.length) { console.error('FAIL\n' + errors.join('\n')); process.exit(1); }
console.log(`OK — ${PRODUCTS.length} products, ${slugs.size} slugs${CHECK_FILES ? ', all files present' : ''}`);
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd web && node scripts/check-product-media.mjs`
Expected: FAIL listing "missing slug" for every product.

- [ ] **Step 3: Add `slug` + `media` to each product in `products.js`**

For each product object, add `slug` and `media` (keep existing `image` for back-compat). Use this
exact mapping (NN = zero-padded folder = the product's `num`, except Mixing Bowl uses `11`):

```js
// 01 Body Wash
slug: '01-body-wash',
media: { still:'/products/01/still.webp', stillMobile:'/products/01/still@600.webp',
  gallery:['/products/01/use-1.webp','/products/01/use-2.webp','/products/01/detail.webp'],
  poster:'/products/01/poster.jpg', video:null },
// 02 Italy Towel Mitt
slug: '02-italy-towel-mitt',
media: { still:'/products/02/still.webp', stillMobile:'/products/02/still@600.webp',
  gallery:['/products/02/use-1.webp','/products/02/use-2.webp','/products/02/detail.webp'],
  poster:'/products/02/poster.jpg', video:null },
// 03 Back Scrub Cloth (no film → poster null)
slug: '03-back-scrub-cloth',
media: { still:'/products/03/still.webp', stillMobile:'/products/03/still@600.webp',
  gallery:['/products/03/use-1.webp','/products/03/use-2.webp','/products/03/detail.webp'],
  poster:null, video:null },
// 04 Scalp Massager (no film → poster null)
slug: '04-scalp-massager',
media: { still:'/products/04/still.webp', stillMobile:'/products/04/still@600.webp',
  gallery:['/products/04/use-1.webp','/products/04/use-2.webp','/products/04/detail.webp'],
  poster:null, video:null },
// 05 Rhassoul Clay
slug: '05-atlas-clay',
media: { still:'/products/05/still.webp', stillMobile:'/products/05/still@600.webp',
  gallery:['/products/05/use-1.webp','/products/05/use-2.webp','/products/05/detail.webp'],
  poster:'/products/05/poster.jpg', video:null },
// 06 Argan Oil
slug: '06-argan-oil',
media: { still:'/products/06/still.webp', stillMobile:'/products/06/still@600.webp',
  gallery:['/products/06/use-1.webp','/products/06/use-2.webp','/products/06/detail.webp'],
  poster:'/products/06/poster.jpg', video:null },
// 07 Body Lotion
slug: '07-body-lotion',
media: { still:'/products/07/still.webp', stillMobile:'/products/07/still@600.webp',
  gallery:['/products/07/use-1.webp','/products/07/use-2.webp'],
  poster:'/products/07/poster.jpg', video:null },
// 08 Cleansing Cloth (no new shoot — keep legacy png as still, no gallery/film)
slug: '08-cleansing-cloth',
media: { still:'/products/08-cleansing-cloth.png', stillMobile:null, gallery:[], poster:null, video:null },
// num 11 Clay Mixing Bowl
slug: '11-clay-mixing-bowl',
media: { still:'/products/11/still.webp', stillMobile:'/products/11/still@600.webp',
  gallery:['/products/11/use-1.webp','/products/11/use-2.webp'], poster:null, video:null },
// 09 Turkish Kese Mitt (comingSoon — no media yet)
slug: '09-turkish-kese-mitt',
media: { still:null, stillMobile:null, gallery:[], poster:null, video:null },
// 10 Beidi Black Soap (comingSoon — no media yet)
slug: '10-beidi-black-soap',
media: { still:null, stillMobile:null, gallery:[], poster:null, video:null },
```

- [ ] **Step 4: Run check, verify it passes (shape only)**

Run: `cd web && node scripts/check-product-media.mjs`
Expected: `OK — 11 products, 11 slugs`

- [ ] **Step 5: Commit**

```bash
git add web/scripts/check-product-media.mjs web/src/data/products.js
git commit -m "feat: add slug + media model to products with integrity check"
```

---

### Task 2: Image build pipeline — curate, optimize, commit

**Files:**
- Create: `web/scripts/build-product-images.py`
- Create (generated, committed): `web/public/products/<NN>/*.webp`

**Interfaces:**
- Consumes: the `slug`/`media` paths from Task 1.
- Produces: every `media.still/stillMobile/gallery` WebP referenced in Task 1 exists on disk.

- [ ] **Step 1: Write the build script with the curation manifest**

Create `web/scripts/build-product-images.py`:

```python
#!/usr/bin/env python3
"""Curate + optimize SOLUM product photos into web/public/products/<NN>/*.webp.
Re-runnable. Source photos are local-only (not committed)."""
import os, sys
from PIL import Image

SRC = os.path.expanduser("~/Downloads/solum-photo-download-1of1/Highlights")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "products")
def src(n): return os.path.join(SRC, f"SOCO_SOLUM_SE-{n}.jpg")

# folder -> {output name: source SE number}.  (still + 3 gallery: use-1,use-2,detail)
MANIFEST = {
  "01": {"still":4,  "use-1":77, "use-2":84, "detail":8},
  "02": {"still":56, "use-1":135,"use-2":146,"detail":43},
  "03": {"still":59, "use-1":124,"use-2":128,"detail":51},
  "04": {"still":28, "use-1":116,"use-2":119,"detail":26},
  "05": {"still":16, "use-1":108,"use-2":110,"detail":22},
  "06": {"still":24, "use-1":92, "use-2":100,"detail":25},
  "07": {"still":30, "use-1":31, "use-2":32},
  "11": {"still":35, "use-1":33, "use-2":36},
}
LARGE, MOBILE, Q = 1200, 600, 80

def save(im, path, w):
    im2 = im.copy(); im2.thumbnail((w, w*4), Image.LANCZOS)
    im2.save(path, "WEBP", quality=Q, method=6)

for folder, shots in MANIFEST.items():
    d = os.path.join(OUT, folder); os.makedirs(d, exist_ok=True)
    for name, n in shots.items():
        p = src(n)
        if not os.path.exists(p): sys.exit(f"missing source {p}")
        im = Image.open(p).convert("RGB")
        save(im, os.path.join(d, f"{name}.webp"), LARGE)
        if name == "still":
            save(im, os.path.join(d, "still@600.webp"), MOBILE)
        print(folder, name, "<-", os.path.basename(p))
print("done")
```

- [ ] **Step 2: Run the build**

Run: `cd web && python3 scripts/build-product-images.py`
Expected: prints each mapping, ends `done`; creates `public/products/01..07,11/*.webp`.

- [ ] **Step 3: Run the integrity check with file existence**

Run: `cd web && node scripts/check-product-media.mjs --files`
Expected: `OK — 11 products, 11 slugs, all files present`
(If a `08` or coming-soon path is flagged, those are legacy/null by design — the check only
asserts existence for non-null paths; `08` points at the existing legacy PNG which is present.)

- [ ] **Step 4: Spot-check one image visually**

Run: `cd web && npm run dev` then open `http://localhost:5173/products/01/use-1.webp` in browser.
Expected: the body-wash pour shot renders, sharp, dark background.

- [ ] **Step 5: Commit (binary assets included)**

```bash
git add web/scripts/build-product-images.py web/public/products
git commit -m "feat: optimized product photography pipeline + assets"
```

---

### Task 3: Video transcode + poster pipeline + CDN wiring

**Files:**
- Create: `web/scripts/build-product-videos.sh`
- Create (committed): `web/public/products/<NN>/poster.jpg`, `web/public/video/banner-poster.jpg`
- Create: `web/src/data/productMedia.js`
- Create (gitignored output for manual CDN upload): `web/.media-build/`
- Modify: `web/.gitignore`

**Interfaces:**
- Produces: `PRODUCT_VIDEO` map + `BANNER` object in `productMedia.js`, each `{ mp4, webm, poster, ready }`.
  `ready:false` ⇒ consumers (Tasks 4,6) render poster only. Posters committed; mp4/webm uploaded
  manually to CDN then `ready` flipped to `true`.

- [ ] **Step 1: Write the transcode script**

Create `web/scripts/build-product-videos.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
SRC="$HOME/Downloads/drive-download-20260625T092428Z-3-001"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.media-build"; PUB="$ROOT/public"
mkdir -p "$OUT" "$PUB/video"

vert () { # $1 src file  $2 NN  (720x1280 H.264 + webm + committed poster)
  ffmpeg -y -i "$SRC/$1" -vf "scale=720:1280" -c:v libx264 -crf 24 -preset slow -an -movflags +faststart "$OUT/$2_720.mp4"
  ffmpeg -y -i "$SRC/$1" -vf "scale=720:1280" -c:v libvpx-vp9 -crf 34 -b:v 0 -an "$OUT/$2_720.webm"
  mkdir -p "$PUB/products/$2"
  ffmpeg -y -ss 00:00:02 -i "$SRC/$1" -frames:v 1 -vf "scale=720:1280" "$PUB/products/$2/poster.jpg"
}

# banner: 4K 16:9 -> 1080p H.264 + webm + committed poster
ffmpeg -y -i "$SRC/SOLUM - BANNER FILM.mp4" -vf "scale=1920:1080" -c:v libx264 -crf 23 -preset slow -an -movflags +faststart "$OUT/banner_1080.mp4"
ffmpeg -y -i "$SRC/SOLUM - BANNER FILM.mp4" -vf "scale=1920:1080" -c:v libvpx-vp9 -crf 32 -b:v 0 -an "$OUT/banner_1080.webm"
ffmpeg -y -ss 00:00:02 -i "$SRC/SOLUM - BANNER FILM.mp4" -frames:v 1 -vf "scale=1920:1080" "$PUB/video/banner-poster.jpg"

vert "SOLUM - BODY WASH.mp4"       01
vert "SOLUM - ITALY TOWEL MITT.mp4" 02
vert "SOLUM - ATLAS CLAY MASK.mp4"  05
vert "SOLUM - ARGON BODY OIL.mp4"   06
vert "SOLUM - BODY LOTION.mp4"      07
echo "TRANSCODE DONE — upload $OUT/*.{mp4,webm} to CDN, then flip ready flags in productMedia.js"
ls -lh "$OUT"
```

- [ ] **Step 2: Run it**

Run: `cd web && chmod +x scripts/build-product-videos.sh && ./scripts/build-product-videos.sh`
Expected: ends `TRANSCODE DONE`; `.media-build/` holds banner + 01,02,05,06,07 mp4+webm (each
a few MB); committed posters appear under `public/products/<NN>/poster.jpg` and
`public/video/banner-poster.jpg`.

- [ ] **Step 3: Gitignore the upload-only build dir**

Add to `web/.gitignore`:

```
.media-build/
```

- [ ] **Step 4: Create the video data file (ready=false until upload)**

Create `web/src/data/productMedia.js`:

```js
// Product films + banner. Transcoded by scripts/build-product-videos.sh, hosted on CDN.
// Flip `ready` to true per item AFTER uploading the matching .media-build/*.{mp4,webm} to CDN.
import { CDN } from './ritualVideo.js';
const P = `${CDN}/video/products`;

export const BANNER = {
  mp4:  `${CDN}/video/banner/banner_1080.mp4`,
  webm: `${CDN}/video/banner/banner_1080.webm`,
  poster: '/video/banner-poster.jpg',
  ready: false,
};

// keyed by product slug
export const PRODUCT_VIDEO = {
  '01-body-wash':        { mp4:`${P}/01_720.mp4`, webm:`${P}/01_720.webm`, poster:'/products/01/poster.jpg', ready:false },
  '02-italy-towel-mitt': { mp4:`${P}/02_720.mp4`, webm:`${P}/02_720.webm`, poster:'/products/02/poster.jpg', ready:false },
  '05-atlas-clay':       { mp4:`${P}/05_720.mp4`, webm:`${P}/05_720.webm`, poster:'/products/05/poster.jpg', ready:false },
  '06-argan-oil':        { mp4:`${P}/06_720.mp4`, webm:`${P}/06_720.webm`, poster:'/products/06/poster.jpg', ready:false },
  '07-body-lotion':      { mp4:`${P}/07_720.mp4`, webm:`${P}/07_720.webm`, poster:'/products/07/poster.jpg', ready:false },
};

export function videoFor(slug) {
  const v = PRODUCT_VIDEO[slug];
  return v && v.ready ? v : null; // null ⇒ caller uses poster/still
}
```

- [ ] **Step 5: Commit**

```bash
git add web/scripts/build-product-videos.sh web/.gitignore web/src/data/productMedia.js \
        web/public/products/*/poster.jpg web/public/video/banner-poster.jpg
git commit -m "feat: product/banner video transcode pipeline + posters + CDN data layer"
```

---

### Task 4: Dedicated product pages — `/product/:slug`

**Files:**
- Create: `web/src/pages/ProductPage.jsx`
- Modify: `web/src/App.jsx` (import + route)
- Modify: `web/public/sitemap.xml` (append product URLs)
- Create: `web/e2e/product-page.spec.ts`

**Interfaces:**
- Consumes: `PRODUCTS` (Task 1), `videoFor(slug)` (Task 3).
- Produces: route `/product/:slug` rendering name/tagline/hero/gallery/details; unknown slug → `NotFoundPage`.

- [ ] **Step 1: Write the Playwright e2e first**

Create `web/e2e/product-page.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('product page renders hero + name + gallery', async ({ page }) => {
  await page.goto('/product/01-body-wash');
  await expect(page.getByRole('heading', { name: /body wash/i })).toBeVisible();
  await expect(page.locator('.pp-hero')).toBeVisible();
  await expect(page.locator('.pp-gallery img').first()).toBeVisible();
});

test('unknown product slug shows not found', async ({ page }) => {
  await page.goto('/product/does-not-exist');
  await expect(page.getByText(/not found/i)).toBeVisible();
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd web && npm run dev` (separate shell) then `npx playwright test e2e/product-page.spec.ts`
Expected: FAIL — route not defined / heading not found.

- [ ] **Step 3: Create `ProductPage.jsx`**

Editorial, mobile-first. Hero = film (if `videoFor` returns ready) over poster, else `still`.
Gallery interleaves `media.gallery` with existing `benefits`. Reuses `desc`, `highlights`,
`origin`, `size`, `lifespan` verbatim. Meta via `useEffect` (GuideArticle pattern).

```jsx
import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PRODUCTS } from '../data/products.js';
import { videoFor } from '../data/productMedia.js';
import Nav from '../components/Nav.jsx';
import SolumFooter from '../components/SolumFooter.jsx';
import NotFoundPage from './NotFoundPage.jsx';
import { capture } from '../lib/analytics.js';

const CSS = `
.pp{background:var(--black);color:var(--bone);padding-top:64px;}
.pp-hero{position:relative;width:100%;aspect-ratio:9/16;max-height:86vh;background:#000;overflow:hidden;}
@media(min-width:769px){.pp-hero{aspect-ratio:16/10;max-height:80vh;}}
.pp-hero video,.pp-hero img{width:100%;height:100%;object-fit:cover;display:block;}
.pp-hero-overlay{position:absolute;left:0;bottom:0;padding:32px 24px;background:linear-gradient(transparent,rgba(8,9,11,.85));width:100%;}
.pp-num{font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.15em;color:var(--bone);opacity:.7;}
.pp-name{font-family:'Bebas Neue',sans-serif;font-size:clamp(40px,8vw,84px);letter-spacing:.04em;line-height:.92;margin:4px 0;}
.pp-tagline{font-size:17px;font-weight:300;color:var(--mist);max-width:520px;}
.pp-body{max-width:760px;margin:0 auto;padding:56px 24px;}
.pp-desc{font-size:16px;line-height:1.7;font-weight:300;color:var(--mist);}
.pp-gallery{display:grid;gap:2px;margin:40px 0;}
.pp-gallery img{width:100%;display:block;}
.pp-benefits{list-style:none;padding:0;margin:32px 0;display:flex;flex-direction:column;gap:14px;}
.pp-benefits li{font-size:15px;line-height:1.6;font-weight:300;color:var(--mist);padding-left:18px;position:relative;}
.pp-benefits li::before{content:'';position:absolute;left:0;top:9px;width:6px;height:6px;background:var(--blue);}
.pp-chips{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0;}
.pp-chip{font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:600;color:var(--bone);border:1px solid var(--line);padding:6px 12px;border-radius:3px;}
.pp-meta{display:flex;gap:24px;flex-wrap:wrap;font-size:13px;color:var(--stone);margin:20px 0;}
.pp-cta{display:inline-flex;align-items:center;gap:8px;background:var(--blue);color:var(--bone);font-weight:600;letter-spacing:2px;text-transform:uppercase;font-size:13px;padding:14px 28px;border-radius:4px;text-decoration:none;margin-top:8px;}
.pp-nav{display:flex;justify-content:space-between;border-top:1px solid var(--line);max-width:760px;margin:0 auto;padding:24px;font-size:13px;}
.pp-nav a{color:var(--blit);text-decoration:none;letter-spacing:1px;text-transform:uppercase;font-weight:600;}
`;

export default function ProductPage() {
  const { slug } = useParams();
  const idx = PRODUCTS.findIndex(p => p.slug === slug);
  const p = PRODUCTS[idx];

  useEffect(() => {
    if (!p) return;
    document.title = `${p.fullName || p.name} · SOLUM`;
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', p.tagline || p.desc?.slice(0, 150) || '');
    let c = document.querySelector('link[rel="canonical"]');
    if (c) c.setAttribute('href', `https://bysolum.co.uk/product/${slug}`);
    capture('product_page_viewed', { slug });
  }, [p, slug]);

  if (!p) return <NotFoundPage />;

  const active = PRODUCTS.filter(x => !x.comingSoon);
  const myActiveIdx = active.findIndex(x => x.slug === slug);
  const prev = active[(myActiveIdx - 1 + active.length) % active.length];
  const next = active[(myActiveIdx + 1) % active.length];
  const film = videoFor(slug);
  const heroPoster = p.media?.poster || p.media?.still;

  return (
    <>
      <style>{CSS}</style>
      <Nav />
      <article className="pp">
        <div className="pp-hero">
          {film
            ? <video poster={heroPoster} muted autoPlay loop playsInline preload="none">
                <source src={film.webm} type="video/webm" />
                <source src={film.mp4} type="video/mp4" />
              </video>
            : <img src={p.media?.still} alt={`${p.name} — SOLUM`} />}
          <div className="pp-hero-overlay">
            <div className="pp-num">PRODUCT · {p.num}</div>
            <h1 className="pp-name">{p.name}</h1>
            <p className="pp-tagline">{p.tagline}</p>
          </div>
        </div>

        <div className="pp-body">
          <div className="pp-meta">
            <span>{p.origin}</span>{p.size && <span>{p.size}</span>}{p.lifespan && <span>{p.lifespan}</span>}
          </div>
          <p className="pp-desc">{p.desc}</p>
          <div className="pp-chips">{(p.highlights || []).map(h => <span key={h} className="pp-chip">{h}</span>)}</div>
        </div>

        {(p.media?.gallery || []).length > 0 && (
          <div className="pp-gallery">
            {p.media.gallery.map((src, i) => (
              <img key={src} src={src} alt={`${p.name} in use ${i + 1}`} loading="lazy" />
            ))}
          </div>
        )}

        <div className="pp-body">
          {(p.benefits || []).length > 0 && (
            <ul className="pp-benefits">{p.benefits.map(b => <li key={b}>{b}</li>)}</ul>
          )}
          <Link to="/ritual" className="pp-chip" style={{ display: 'inline-block', marginRight: 8 }}>See the ritual ↗</Link>
          <div><Link to="/buy" className="pp-cta" onClick={() => capture('product_buy_clicked', { slug })}>Shop the kits</Link></div>
        </div>

        <nav className="pp-nav">
          <Link to={`/product/${prev.slug}`}>← {prev.name}</Link>
          <Link to={`/product/${next.slug}`}>{next.name} →</Link>
        </nav>
      </article>
      <SolumFooter />
    </>
  );
}
```

- [ ] **Step 4: Wire the route in `App.jsx`**

Add import with the other page imports and a route inside `<Routes>` (place above the `*` catch-all):

```jsx
import ProductPage from './pages/ProductPage.jsx';
// ...
<Route path="/product/:slug" element={<ProductPage />} />
```

- [ ] **Step 5: Append product URLs to `sitemap.xml`**

Add before the closing `</urlset>`:

```xml
  <!-- Products -->
  <url><loc>https://bysolum.co.uk/product/01-body-wash</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://bysolum.co.uk/product/02-italy-towel-mitt</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://bysolum.co.uk/product/03-back-scrub-cloth</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://bysolum.co.uk/product/04-scalp-massager</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://bysolum.co.uk/product/05-atlas-clay</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://bysolum.co.uk/product/06-argan-oil</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://bysolum.co.uk/product/07-body-lotion</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
```

- [ ] **Step 6: Run e2e, verify pass**

Run: `npx playwright test e2e/product-page.spec.ts`
Expected: both tests PASS.

- [ ] **Step 7: Manual visual check**

In browser: `/product/05-atlas-clay` (film slot → shows poster/still since `ready:false`),
gallery of clay-on-chest shots visible, prev/next cycle through active products, mobile width OK.

- [ ] **Step 8: Commit**

```bash
git add web/src/pages/ProductPage.jsx web/src/App.jsx web/public/sitemap.xml web/e2e/product-page.spec.ts
git commit -m "feat: dedicated /product/:slug editorial pages"
```

---

### Task 5: Homepage `ProductLineup` → image-led cards linking to product pages

**Files:**
- Modify: `web/src/components/ProductLineup.jsx` (rework cards, remove detail modal)
- Create: `web/e2e/product-lineup.spec.ts`

**Interfaces:**
- Consumes: `PRODUCTS` `slug`/`media` (Task 1), routes (Task 4).
- Produces: each card is an `<a href="/product/:slug">` (or `useNavigate`) photo card; modal code removed.

- [ ] **Step 1: Write the e2e first**

Create `web/e2e/product-lineup.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('homepage product card links to its product page', async ({ page }) => {
  await page.goto('/full');
  const card = page.locator('.product-card').first();
  await expect(card.locator('img')).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/product\/[a-z0-9-]+/);
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx playwright test e2e/product-lineup.spec.ts`
Expected: FAIL — card click does not navigate (modal still opens / no link).

- [ ] **Step 3: Rework `ProductLineup.jsx`**

Replace the card with a navigating photo card and delete the modal/backdrop code and its state.
Card markup (inside the existing `.products-grid` map; `useNavigate` from react-router-dom):

```jsx
// at top: import { useNavigate } from 'react-router-dom';
// inside component: const navigate = useNavigate();
// replace each card with:
<a key={p.num} className="product-card"
   href={`/product/${p.slug}`}
   onClick={(e) => { e.preventDefault(); capture('product_card_clicked', { slug: p.slug }); navigate(`/product/${p.slug}`); }}>
  <div className="prod-img-wrap">
    <img src={p.media?.still || p.image} srcSet={p.media?.stillMobile ? `${p.media.stillMobile} 600w, ${p.media.still} 1200w` : undefined}
         sizes="(max-width:768px) 50vw, 25vw" alt={p.name} loading="lazy" width="600" height="800" />
    <span className="prod-badge-num">{p.num}</span>
    {p.tag?.includes('Daily') && <span className="prod-badge-freq daily">Daily</span>}
    {p.tag?.includes('Weekly') && <span className="prod-badge-freq weekly">Weekly</span>}
    {p.comingSoon && <span className="prod-badge-freq soon">Soon</span>}
  </div>
  <div className="prod-info">
    <div className="prod-name">{p.name}</div>
    <div className="prod-tagline">{p.tagline}</div>
    <span className="prod-view-details">View ↗</span>
  </div>
</a>
```

Remove: `useState` for the open product, the `.pd-backdrop`/detail-panel JSX, and now-unused
detail CSS (`.pd-*`, `.prod-highlights`, `.prod-lifespan`, `.prod-benefit*`). Add
`.product-card{text-decoration:none;color:inherit;}` to the CSS. Keep `comingSoon` products
non-clickable: render them as a `<div className="product-card">` (no href) when `p.comingSoon`.

- [ ] **Step 4: Run e2e, verify pass**

Run: `npx playwright test e2e/product-lineup.spec.ts`
Expected: PASS.

- [ ] **Step 5: Manual check + regression**

Browser `/full`: grid is photo-dominant, hover zoom intact, coming-soon cards not clickable,
click navigates to the right product. Run full suite: `npx playwright test` — no new failures.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/ProductLineup.jsx web/e2e/product-lineup.spec.ts
git commit -m "feat: image-led product cards linking to product pages; remove modal"
```

---

### Task 6: Hero banner film

**Files:**
- Modify: `web/src/components/Hero.jsx`

**Interfaces:**
- Consumes: `BANNER` from `productMedia.js` (Task 3).
- Produces: hero renders banner film background when `BANNER.ready`, else `BANNER.poster`; existing
  headline/CTA/analytics preserved.

- [ ] **Step 1: Read current Hero to find the background element**

Run: `sed -n '1,80p' web/src/components/Hero.jsx` — locate the existing hero background image/wrapper
and the `prefers-reduced-motion` handling if any.

- [ ] **Step 2: Add the film background**

Import `BANNER`, and render behind the existing overlay/headline. Use a media query + JS guard for
reduced motion (poster only):

```jsx
import { BANNER } from '../data/productMedia.js';
// ...
const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// background slot (place as first child of the hero wrapper, absolutely positioned, behind content):
{BANNER.ready && !reduce ? (
  <video className="hero-bg-video" poster={BANNER.poster} muted autoPlay loop playsInline preload="none"
         style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:0 }}>
    <source src={BANNER.webm} type="video/webm" />
    <source src={BANNER.mp4} type="video/mp4" />
  </video>
) : (
  <img className="hero-bg-img" src={BANNER.poster} alt="" aria-hidden="true"
       style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:0 }} />
)}
```

Ensure the headline/CTA container has `position:relative; z-index:1`. Keep all existing copy/CTA.
(Since `BANNER.ready` is `false` until upload, the poster `/video/banner-poster.jpg` from Task 3
shows now — verify it exists.)

- [ ] **Step 3: Manual check**

Browser `/full`: hero shows the banner poster frame as background, headline/CTA legible over it,
no layout shift. Toggle OS reduce-motion → still poster (no video even when later ready).

- [ ] **Step 4: Commit**

```bash
git add web/src/components/Hero.jsx
git commit -m "feat: banner film hero background with poster fallback"
```

---

### Task 7: Unboxing moment near kit/subscription

**Files:**
- Create: `web/public/products/kit/` images (add to Task 2 manifest) OR reuse via a small manifest addition
- Modify: `web/scripts/build-product-images.py` (add `kit` entry: still 62, use-1 66, use-2 48)
- Modify: `web/src/components/SubscriptionSection.jsx` (add an unboxing image band) — confirm filename first
- Modify: `web/src/data/productMedia.js` (add `UNBOXING = { mp4,webm,poster:'/products/kit/poster.jpg', ready:false }`)

**Interfaces:**
- Produces: a visual unboxing band (box flatlays now; `UNBOXING` video slot ready-flagged for later).

- [ ] **Step 1: Add kit shots to the image manifest and rebuild**

In `build-product-images.py` `MANIFEST`, add:

```python
  "kit": {"still":62, "use-1":66, "use-2":48},
```

Run: `cd web && python3 scripts/build-product-images.py` → creates `public/products/kit/*.webp`.

- [ ] **Step 2: Add the UNBOXING slot to `productMedia.js`**

```js
export const UNBOXING = {
  mp4:  `${CDN}/video/unboxing/unboxing_720.mp4`,
  webm: `${CDN}/video/unboxing/unboxing_720.webm`,
  poster: '/products/kit/still.webp',
  ready: false,
};
```

- [ ] **Step 3: Identify the insertion section**

Run: `grep -n "subscription\|first box\|className=\"" web/src/components/SubscriptionSection.jsx | head`
to find a clean insertion point near the top of the section's returned JSX.

- [ ] **Step 4: Insert an unboxing band**

Add, using `UNBOXING.ready` to choose video vs poster image (same pattern as Hero), with the
two kit gallery shots beneath. Headline copy: "Head to toe. Cared for." (matches the box artwork).
Keep within existing section container; images `loading="lazy"`, explicit dims.

- [ ] **Step 5: Manual check + commit**

Browser `/full`: unboxing band shows the box flatlay, copy legible, no shift.

```bash
git add web/scripts/build-product-images.py web/public/products/kit web/src/components/SubscriptionSection.jsx web/src/data/productMedia.js
git commit -m "feat: unboxing band with kit flatlays + video slot"
```

---

### Task 8: Real photography across `/buy` and `/ritual`

**Files:**
- Modify: `web/src/pages/BuyPage.jsx` (thumbnails prefer `media.still`)
- Modify: `web/src/data/ritualVideo.js` (RITUALS product `img` → new stills)
- Modify: `web/src/components/ritual/RitualVideoSelector.jsx` — confirm it reads `img` from RITUALS

**Interfaces:**
- Consumes: `media.still` (Task 1/2).
- Produces: `/buy` and `/ritual` show new photography; no logic/flow changes.

- [ ] **Step 1: BuyPage thumbnails**

In `BuyPage.jsx` (lines ~272–277), change the image source to prefer the new still:

```jsx
{ (p.media?.still || p.image)
    ? <img src={p.media?.still || p.image} alt={p.name} className="co-product-thumb" loading="lazy" />
    : /* keep existing placeholder */ }
```

- [ ] **Step 2: Ritual product thumbnails**

In `ritualVideo.js`, update each `RITUALS.daily.products[].img` and `RITUALS.weekly.products[].img`
to the new stills (keep `08` on its legacy png; it has no new shoot):

```js
// daily: 04 -> '/products/04/still.webp', 01 -> '/products/01/still.webp',
//        03 -> '/products/03/still.webp', 08 -> '/products/08-cleansing-cloth.png',
//        07 -> '/products/07/still.webp'
// weekly: 05 -> '/products/05/still.webp', 04 -> '/products/04/still.webp',
//         02 -> '/products/02/still.webp', 06 -> '/products/06/still.webp'
```

- [ ] **Step 3: Manual check**

Browser `/buy` (kit cards show real product stills) and `/ritual` (step product chips show new
stills, video selector still works).

- [ ] **Step 4: Run full e2e (buy flow must still pass)**

Run: `npx playwright test`
Expected: `buy-flow.spec.ts`, `product-page.spec.ts`, `product-lineup.spec.ts` all PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/BuyPage.jsx web/src/data/ritualVideo.js
git commit -m "feat: real product photography across /buy and /ritual"
```

---

### Task 9: Legacy cleanup (after full local verification)

**Files:**
- Modify: `web/src/data/products.js` (remove now-unused `image` keys where a `media.still` exists)
- Delete: `web/public/products/0{1..7}-*.png` (only those fully replaced; keep `08-cleansing-cloth.png`, `09-mixing-bowl.png` if still referenced)

**Interfaces:** none new.

- [ ] **Step 1: Find remaining references to legacy PNGs**

Run: `grep -rn "products/0[1-7]-" web/src` — confirm nothing except the `image` fallback remains.

- [ ] **Step 2: Remove replaced legacy PNGs + dead `image` fallbacks**

Delete only the PNGs with a verified `media.still` replacement and whose path no longer appears in
`grep`. Leave `08`/mixing-bowl PNGs (still referenced).

- [ ] **Step 3: Run integrity + full e2e**

Run: `cd web && node scripts/check-product-media.mjs --files && npx playwright test`
Expected: integrity `OK`, all e2e PASS.

- [ ] **Step 4: Commit**

```bash
git add web/src/data/products.js web/public/products
git commit -m "chore: remove legacy product PNGs replaced by new photography"
```

---

## Post-implementation (manual, by user — not a code task)

1. Upload `web/.media-build/*.{mp4,webm}` to CDN paths:
   `video/banner/`, `video/products/`, (later) `video/unboxing/`.
2. Flip `ready:true` in `productMedia.js` for each uploaded item; re-test locally.
3. Review homepage + a product page on mobile.
4. Sign off, then merge `dev` → master / push to prod per workflow rules.

## Self-Review notes

- **Spec coverage:** §3.1 images→T2; §3.2 videos→T3; §4 data model→T1; §5.1 product pages→T4;
  §5.2 lineup→T5; §5.3 hero→T6; §5.4 unboxing→T7; §5.5 buy→T8; §5.6 ritual→T8; §6 perf/a11y→
  constraints + per-task `loading`/`preload`/reduced-motion; §7 curation→T2 manifest + T8 ritual map;
  §9 cleanup→T9. No gaps.
- **No unit framework:** automated gates are the Node integrity script + Playwright e2e; visual
  correctness verified manually (called out per task). This is the honest harness for this repo.
- **Type consistency:** `media.{still,stillMobile,gallery,poster,video}` and `videoFor(slug)` /
  `PRODUCT_VIDEO`/`BANNER`/`UNBOXING` `{mp4,webm,poster,ready}` used identically across T1,3,4,6,7.
