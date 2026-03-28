-- ─────────────────────────────────────────────
-- SOLUM Inventory — Seed Products & Kit Composition
-- Source of truth: web/src/data/kits.js + products.js
-- All stock starts at 0 — enter via admin dashboard
-- ─────────────────────────────────────────────

INSERT INTO products (id, name, sku, current_stock, reorder_weeks, unit_cost_pence, is_consumable, is_active) VALUES
  ('product-01', 'Amino Acid Body Wash 250ml',  'SOLUM-01', 0, 8,  320,  true,  true),
  ('product-02', 'Italy Towel Mitt',             'SOLUM-02', 0, 12, 45,   false, true),
  ('product-03', 'Back Scrub Cloth 70cm',        'SOLUM-03', 0, 12, 80,   false, true),
  ('product-04', 'Silicone Scalp Massager',      'SOLUM-04', 0, 12, 200,  false, true),
  ('product-05', 'Atlas Clay Mask 200g',         'SOLUM-05', 0, 8,  350,  true,  true),
  ('product-06', 'Organic Argan Body Oil 50ml',  'SOLUM-06', 0, 8,  550,  true,  true),
  ('product-07', 'Fast-Absorb Body Lotion 400ml','SOLUM-07', 0, 8,  440,  true,  true),
  ('product-08', 'Bamboo Cloth',                 'SOLUM-08', 0, 12, 0,    false, true),
  ('product-09', 'Artisan Turkish Kese Mitt',    'SOLUM-09', 0, 12, 450,  false, false),
  ('product-10', 'Beidi Black Soap',             'SOLUM-10', 0, 8,  0,    true,  false);

-- ─────────────────────────────────────────────
-- Kit composition
-- first_box_qty = units deducted when new subscription starts
-- refill_qty    = units deducted on each monthly invoice (0 = tool, ships once)
-- ─────────────────────────────────────────────

-- GROUND: products 01,02,03,04,05,07,08
INSERT INTO kit_products (kit_id, product_id, first_box_qty, refill_qty) VALUES
  ('ground', 'product-01', 1, 1),  -- Body Wash (consumable)
  ('ground', 'product-02', 1, 0),  -- Italy Towel Mitt (tool)
  ('ground', 'product-03', 1, 0),  -- Back Scrub Cloth (tool)
  ('ground', 'product-04', 1, 0),  -- Scalp Massager (tool)
  ('ground', 'product-05', 1, 1),  -- Clay Mask (consumable)
  ('ground', 'product-07', 1, 1),  -- Body Lotion (consumable)
  ('ground', 'product-08', 1, 0);  -- Bamboo Cloth (tool)

-- RITUAL: products 01,02,03,04,05,06,07,08
INSERT INTO kit_products (kit_id, product_id, first_box_qty, refill_qty) VALUES
  ('ritual', 'product-01', 1, 1),  -- Body Wash (consumable)
  ('ritual', 'product-02', 1, 0),  -- Italy Towel Mitt (tool)
  ('ritual', 'product-03', 1, 0),  -- Back Scrub Cloth (tool)
  ('ritual', 'product-04', 1, 0),  -- Scalp Massager (tool)
  ('ritual', 'product-05', 1, 1),  -- Clay Mask (consumable)
  ('ritual', 'product-06', 1, 1),  -- Argan Oil (consumable)
  ('ritual', 'product-07', 1, 1),  -- Body Lotion (consumable)
  ('ritual', 'product-08', 1, 0);  -- Bamboo Cloth (tool)

-- SOVEREIGN: products 01,03,04,05,06,07,08,09,10 (replaces 02 with 09)
INSERT INTO kit_products (kit_id, product_id, first_box_qty, refill_qty) VALUES
  ('sovereign', 'product-01', 1, 1),  -- Body Wash (consumable)
  ('sovereign', 'product-03', 1, 0),  -- Back Scrub Cloth (tool)
  ('sovereign', 'product-04', 1, 0),  -- Scalp Massager (tool)
  ('sovereign', 'product-05', 1, 1),  -- Clay Mask (consumable)
  ('sovereign', 'product-06', 1, 1),  -- Argan Oil (consumable)
  ('sovereign', 'product-07', 1, 1),  -- Body Lotion (consumable)
  ('sovereign', 'product-08', 1, 0),  -- Bamboo Cloth (tool)
  ('sovereign', 'product-09', 1, 0),  -- Turkish Kese Mitt (tool)
  ('sovereign', 'product-10', 1, 1);  -- Beidi Black Soap (consumable)
