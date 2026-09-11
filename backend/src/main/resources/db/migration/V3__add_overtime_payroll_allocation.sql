ALTER TABLE overtime_requests
    ADD COLUMN payroll_run_id BIGINT,
    ADD COLUMN paid_at DATETIME(6),
    ADD CONSTRAINT fk_overtime_requests_payroll_run FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs (id);

CREATE INDEX idx_overtime_requests_payroll_run ON overtime_requests (org_code, payroll_run_id);
