-- ── kit_inventory ─────────────────────────────────────────────────────────────
-- Admin sets available_count per kit; frontend reads this to block/allow purchases
CREATE TABLE IF NOT EXISTS public.kit_inventory (
  kit_id          text PRIMARY KEY,
  available_count int  NOT NULL DEFAULT 0 CHECK (available_count >= 0),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.kit_inventory (kit_id, available_count)
VALUES ('ground', 0), ('ritual', 0)
ON CONFLICT (kit_id) DO NOTHING;

-- ── bookkeeping_entries ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookkeeping_entries (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date  NOT NULL,
  category    text  NOT NULL CHECK (category IN ('inventory','packaging','marketing','compliance','operations','other')),
  description text  NOT NULL,
  amount_pence int  NOT NULL CHECK (amount_pence > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bk_category_date_idx ON public.bookkeeping_entries (category, date DESC);
CREATE INDEX IF NOT EXISTS bk_date_idx          ON public.bookkeeping_entries (date DESC);

-- ── kit_products: add refill_cadence ─────────────────────────────────────────
ALTER TABLE public.kit_products
  ADD COLUMN IF NOT EXISTS refill_cadence text NOT NULL DEFAULT 'monthly'
    CHECK (refill_cadence IN ('monthly','quarterly','biannual','first_box_only'));

-- Set cadences based on product lifespan
-- monthly: body wash, italy mitt, atlas clay, argan oil, body lotion, cleansing cloth
-- quarterly: back scrub cloth
-- biannual: scalp massager
-- first_box_only: silicone bowl, kese mitt, black soap (tools that don't refill)

UPDATE public.kit_products SET refill_cadence = 'quarterly'     WHERE product_id = 'product-03';
UPDATE public.kit_products SET refill_cadence = 'biannual'      WHERE product_id = 'product-04';
UPDATE public.kit_products SET refill_cadence = 'first_box_only' WHERE product_id IN ('product-09','product-10','product-11');

-- ── Strip dimensions from product names ───────────────────────────────────────
UPDATE public.products SET name = 'Body Wash'       WHERE id = 'product-01';
UPDATE public.products SET name = 'Back Scrub Cloth' WHERE id = 'product-03';
UPDATE public.products SET name = 'Scalp Massager'  WHERE id = 'product-04';
UPDATE public.products SET name = 'Atlas Clay'       WHERE id = 'product-05';
UPDATE public.products SET name = 'Argan Oil'        WHERE id = 'product-06';
UPDATE public.products SET name = 'Body Lotion'      WHERE id = 'product-07';
UPDATE public.products SET name = 'Silicone Bowl'    WHERE id = 'product-11';
