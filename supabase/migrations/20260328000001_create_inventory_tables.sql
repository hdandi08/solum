-- ─────────────────────────────────────────────
-- SOLUM Inventory System — Core Tables
-- ─────────────────────────────────────────────

-- Products master catalog
CREATE TABLE products (
  id                  TEXT PRIMARY KEY,  -- 'product-01' through 'product-10'
  name                TEXT NOT NULL,
  sku                 TEXT NOT NULL UNIQUE,
  current_stock       INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  reorder_weeks       INTEGER NOT NULL DEFAULT 8,  -- alert when runway < N weeks
  unit_cost_pence     INTEGER NOT NULL DEFAULT 0,
  is_consumable       BOOLEAN NOT NULL DEFAULT false, -- true = in monthly refill
  is_active           BOOLEAN NOT NULL DEFAULT true,  -- false = coming soon
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kit composition — which products go in each kit and in what quantity
CREATE TABLE kit_products (
  kit_id              TEXT NOT NULL,   -- 'ground' | 'ritual' | 'sovereign'
  product_id          TEXT NOT NULL REFERENCES products(id),
  first_box_qty       INTEGER NOT NULL DEFAULT 1,  -- units deducted on new sub
  refill_qty          INTEGER NOT NULL DEFAULT 0,  -- units deducted on monthly invoice (0 = tool)
  PRIMARY KEY (kit_id, product_id)
);

-- Immutable log of every stock movement
CREATE TABLE inventory_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          TEXT NOT NULL REFERENCES products(id),
  transaction_type    TEXT NOT NULL CHECK (transaction_type IN ('inbound','outbound_order','adjustment','damaged')),
  quantity            INTEGER NOT NULL,  -- positive = stock in, negative = stock out
  reference_type      TEXT CHECK (reference_type IN ('supplier_delivery','order','manual')),
  reference_id        TEXT,             -- order.id or supplier_order.id
  notes               TEXT,
  created_by          TEXT NOT NULL DEFAULT 'system', -- 'system' | 'admin'
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supplier orders — track replenishment from order to delivery
CREATE TABLE supplier_orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name             TEXT NOT NULL,
  product_id                TEXT NOT NULL REFERENCES products(id),
  quantity                  INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost_pence           INTEGER NOT NULL DEFAULT 0,
  order_date                DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date    DATE,
  actual_delivery_date      DATE,
  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','in_transit','delivered','cancelled')),
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────
CREATE INDEX idx_inventory_transactions_product    ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_type       ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_created    ON inventory_transactions(created_at DESC);
CREATE INDEX idx_inventory_transactions_reference  ON inventory_transactions(reference_id);
CREATE INDEX idx_supplier_orders_product           ON supplier_orders(product_id);
CREATE INDEX idx_supplier_orders_status            ON supplier_orders(status);

-- ─── Auto-update updated_at ────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER supplier_orders_updated_at
  BEFORE UPDATE ON supplier_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ───────────────────────────────────────
-- All inventory tables are admin-only — accessed via service role in edge functions
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders        ENABLE ROW LEVEL SECURITY;

-- Public read-only on products (needed for frontend inventory check)
CREATE POLICY "products_public_read"
  ON products FOR SELECT USING (true);

CREATE POLICY "kit_products_public_read"
  ON kit_products FOR SELECT USING (true);

-- All writes via service role only (edge functions)
