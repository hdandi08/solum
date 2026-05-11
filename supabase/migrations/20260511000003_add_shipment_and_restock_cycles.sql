-- Rename consumer_cycle_days → restock_lead_days (supplier replenishment lead time, default 60 days)
ALTER TABLE products RENAME COLUMN consumer_cycle_days TO restock_lead_days;

-- shipment_cycle_days: how often we ship this product to customers
-- Drives monthly demand: units/sub/month = refill_qty × (30 ÷ shipment_cycle_days)
ALTER TABLE products ADD COLUMN shipment_cycle_days INT NOT NULL DEFAULT 30;

-- Monthly (30 days): Body Wash, Italy Towel Mitt, Atlas Clay, Argan Oil, Body Lotion, Cleansing Cloth, Beidi Black Soap
UPDATE products SET shipment_cycle_days = 30
  WHERE id IN ('product-01','product-02','product-05','product-06','product-07','product-08','product-10');

-- Every 90 days: Back Scrub Cloth
UPDATE products SET shipment_cycle_days = 90 WHERE id = 'product-03';

-- Annual (365 days): Scalp Massager, Turkish Kese Mitt
UPDATE products SET shipment_cycle_days = 365 WHERE id IN ('product-04','product-09');
