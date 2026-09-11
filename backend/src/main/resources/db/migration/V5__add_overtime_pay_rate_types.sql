ALTER TABLE overtime_policies
    ADD COLUMN pay_rate_type VARCHAR(40) NOT NULL DEFAULT 'FIXED_HOURLY_AMOUNT' AFTER designation_id;

ALTER TABLE overtime_requests
    ADD COLUMN approved_pay_rate_type VARCHAR(40),
    ADD COLUMN approved_pay_rate_value DECIMAL(14, 2);
