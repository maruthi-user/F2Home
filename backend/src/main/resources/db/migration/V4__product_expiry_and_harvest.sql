-- ============================================================
-- V4: Perishable auto-expiry + harvest date on product listings
-- ============================================================

ALTER TABLE f2home_products
    ADD COLUMN harvest_date DATE,
    ADD COLUMN perishable   BOOLEAN   NOT NULL DEFAULT FALSE,
    ADD COLUMN expires_at   TIMESTAMP,
    ADD COLUMN ended_at     TIMESTAMP;

ALTER TABLE f2home_products DROP CONSTRAINT ck_f2home_products_status;
ALTER TABLE f2home_products ADD CONSTRAINT ck_f2home_products_status
    CHECK (status IN ('ACTIVE', 'EXPIRED', 'DELETED'));

-- Existing deleted rows: use their last update as the end time.
UPDATE f2home_products SET ended_at = updated_at WHERE status = 'DELETED';

-- Existing live perishable listings (vegetables / fruits) get a fresh 48h
-- window from the migration, so seed data does not vanish instantly.
UPDATE f2home_products
   SET perishable = TRUE,
       expires_at = NOW() + INTERVAL '48 hours'
 WHERE category IN ('vegetables', 'fruits') AND status = 'ACTIVE';

CREATE INDEX idx_f2home_products_expires ON f2home_products (expires_at)
    WHERE status = 'ACTIVE' AND expires_at IS NOT NULL;
