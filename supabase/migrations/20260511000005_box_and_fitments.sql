-- Remove the old separate first-box / refill-mailer products
DELETE FROM products WHERE id IN ('box-first-kit', 'box-monthly-refill');

-- One box used for all shipments, plus 4 fitments (inserts)
INSERT INTO products (id, name, sku, current_stock, reorder_weeks, unit_cost_pence, is_consumable, is_active)
VALUES
  ('box',                   'SOLUM Box',                  'BOX',              0, 4, 0, false, true),
  ('fitment-ground-first',  'Ground First Box Fitment',   'FIT-GRD-FIRST',    0, 4, 0, false, true),
  ('fitment-ritual-first',  'Ritual First Box Fitment',   'FIT-RIT-FIRST',    0, 4, 0, false, true),
  ('fitment-ground-refill', 'Ground Refill Fitment',      'FIT-GRD-REFILL',   0, 4, 0, false, true),
  ('fitment-ritual-refill', 'Ritual Refill Fitment',      'FIT-RIT-REFILL',   0, 4, 0, false, true)
ON CONFLICT (id) DO NOTHING;
