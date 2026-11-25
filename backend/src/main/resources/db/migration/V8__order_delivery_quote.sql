ALTER TABLE f2home_orders
    ADD COLUMN delivery_date DATE,
    ADD COLUMN delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0;
