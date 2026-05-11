-- Add Clay Mixing Bowl (product-11) — included in Ritual and Sovereign first box
INSERT INTO products (id, name, sku, current_stock, reorder_weeks, unit_cost_pence, is_consumable, is_active)
VALUES ('product-11', 'SOLUM Clay Mixing Bowl', 'PROD-11', 0, 8, 0, false, true)
ON CONFLICT (id) DO NOTHING;

-- kit_products: first box only (tool, not a refill consumable)
INSERT INTO kit_products (kit_id, product_id, first_box_qty, refill_qty)
VALUES
  ('ritual',    'product-11', 1, 0),
  ('sovereign', 'product-11', 1, 0)
ON CONFLICT (kit_id, product_id) DO NOTHING;
