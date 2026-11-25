ALTER TABLE f2home_orders
    ADD COLUMN response_deadline TIMESTAMP WITH TIME ZONE,
    ADD COLUMN closure_reason VARCHAR(32);

CREATE INDEX idx_f2home_orders_response_deadline
    ON f2home_orders (status, response_deadline)
    WHERE response_deadline IS NOT NULL;
