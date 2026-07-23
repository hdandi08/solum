# Awin product feed + creatives — design (LOCKED 2026-07-23)

## Goal
Give Awin (advertiser 129171) a **product feed** it fetches daily, and a **bulk
creatives list**, reusing the existing Meta/TikTok catalog data.

## 1. Live feed endpoint — Supabase function `awin-feed`
- `supabase/functions/awin-feed/index.ts`. On GET: query `kit_inventory` for
  GROUND + RITUAL `available_count`, emit a 2-row CSV, return `Content-Type: text/csv`.
- **Public**: deploy `--no-verify-jwt` (Awin fetches unauthenticated; data is public).
- Columns (Awin ShopWindow standard, trivial to map):
  `product_id, product_name, description, merchant_image_url, search_price, currency, merchant_deep_link, in_stock, brand_name, merchant_category, delivery_cost`
  - `product_id`: `ground` / `ritual`
  - `merchant_deep_link`: `https://bysolum.co.uk/buy?kit=<id>` (Awin appends tracking)
  - `search_price`: `65.00` / `85.00`; `currency`: `GBP`
  - `in_stock`: `1` if `available_count > 0` else `0`
  - `merchant_image_url`: kit still (`https://bysolum.co.uk/products/kit/ground.webp` / `.../kit/still.webp`)
  - `brand_name`: `SOLUM`; `merchant_category`: `Health & Beauty > Personal Care > Cosmetics > Skin Care`; `delivery_cost`: `0.00`
  - `description`: reused from the Meta feed kit copy (CSV-escaped).
- Deployed to **dev + prod** (parity rule).

## 2. Clean URL — Amplify rewrite
- `bysolum.co.uk/feeds/awin.csv` → 200-proxy the prod function URL. Give Awin the clean URL.

## 3. Creatives manifest — `artefacts/solum-awin-creatives.csv`
- One row per creative: `name, type, dimensions, url, click_destination`.
- Extracted from the Meta feed (`image_link`, `additional_image_link[]`, `video[].url`) + logo pack (brand-pack, circular Awin logo, wordmarks), deduped.
- Handed to the Awin account manager for bulk load / pasted into Awin's creative section.

## 4. Daily publishing
- No cron. Endpoint is live; configure Awin ShopWindow to fetch the URL **daily** → always current (real stock).

## Build order
feed function → local verify → creatives manifest → Amplify rewrite → deploy dev, verify → master + prod (functions to both).

## Out of scope
- IAB display banners (assets are product/lifestyle, not banners) — add later if display publishers onboard.
- Real-time price changes (prices stable; feed reads them from constants).
