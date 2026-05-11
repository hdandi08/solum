-- consumer_cycle_days: how often a customer physically replaces/consumes the product
-- Used to calculate accurate monthly demand per subscriber
-- Default: 60 days (all products start here, admin can edit per-product)
ALTER TABLE products ADD COLUMN consumer_cycle_days INT NOT NULL DEFAULT 60;

-- Set all active products to the 60-day default baseline
UPDATE products SET consumer_cycle_days = 60 WHERE id IS NOT NULL;
