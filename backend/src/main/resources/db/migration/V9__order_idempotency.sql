ALTER TABLE f2home_orders
    ADD COLUMN idempotency_key UUID,
    ADD COLUMN request_fingerprint VARCHAR(64),
    ADD CONSTRAINT uq_f2home_orders_customer_attempt UNIQUE (customer_id, idempotency_key);
