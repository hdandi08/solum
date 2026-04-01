-- Add VAT, customs duty, and shipping cost tracking to supplier orders
-- Enables accurate landed cost calculation per product

ALTER TABLE supplier_orders
  ADD COLUMN vat_pence           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN customs_duty_pence  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN shipping_cost_pence INTEGER NOT NULL DEFAULT 0;

-- Allow authenticated users to read supplier orders (for admin dashboard)
CREATE POLICY "supplier_orders_authenticated_read"
  ON supplier_orders FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON COLUMN supplier_orders.vat_pence           IS 'Total VAT paid on this order in pence';
COMMENT ON COLUMN supplier_orders.customs_duty_pence  IS 'Total customs duty paid on this order in pence';
COMMENT ON COLUMN supplier_orders.shipping_cost_pence IS 'Total freight/shipping cost for this order in pence';
