-- ============================================================
-- V5: Farmer accept / reject per order line + category snapshot
-- ============================================================

ALTER TABLE f2home_order_items
    ADD COLUMN status     VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN decided_at TIMESTAMP,
    ADD COLUMN category   VARCHAR(50);

ALTER TABLE f2home_order_items ADD CONSTRAINT ck_f2home_order_items_status
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED'));

UPDATE f2home_order_items i
   SET category = p.category
  FROM f2home_products p
 WHERE p.id = i.product_id;

CREATE INDEX idx_f2home_order_items_farmer_status ON f2home_order_items (farmer_id, status);
