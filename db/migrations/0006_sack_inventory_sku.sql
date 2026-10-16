-- Run once in Neon SQL Editor to enable automatically assigned sequential SKUs.
-- Inventory stays stored in kg internally for compatibility with historical transactions,
-- while all current product, purchase, and sales entry is performed in sacks.
CREATE SEQUENCE IF NOT EXISTS rice_product_sku_seq START WITH 1;
SELECT setval(
  'rice_product_sku_seq',
  COALESCE((SELECT MAX((regexp_match(sku, '-([0-9]{5})$'))[1]::bigint)
            FROM products WHERE sku ~ '^SA-INV-[0-9]{8}-[0-9]{5}$'), 0) + 1,
  false
);
