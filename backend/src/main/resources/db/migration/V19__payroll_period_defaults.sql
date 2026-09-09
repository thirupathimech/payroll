ALTER TABLE payroll_runs
    DROP INDEX uk_payroll_run_org_period,
    ADD COLUMN payroll_frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' AFTER period_end,
    ADD COLUMN disbursement_date DATE NULL AFTER payroll_frequency,
    ADD CONSTRAINT uk_payroll_run_org_dates UNIQUE (org_code, period_start, period_end);
