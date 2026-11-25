CREATE INDEX idx_f2home_order_events_reporting
    ON f2home_order_events (status, occurred_at, order_id);
CREATE INDEX idx_f2home_order_cash_resolutions_date
    ON f2home_order_resolutions (resolved_at, order_id)
    WHERE action IN ('CONFIRM_FULL_CASH', 'KEEP_RECORDED_CASH');
