CREATE TABLE payroll_runs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    period_year INT NOT NULL,
    period_month INT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    employee_count INT NOT NULL DEFAULT 0,
    gross_earnings DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total_deductions DECIMAL(14, 2) NOT NULL DEFAULT 0,
    employer_contributions DECIMAL(14, 2) NOT NULL DEFAULT 0,
    net_pay DECIMAL(14, 2) NOT NULL DEFAULT 0,
    approved_by VARCHAR(160),
    approved_at DATETIME(6),
    locked_by VARCHAR(160),
    locked_at DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_payroll_run_org_period UNIQUE (org_code, period_year, period_month)
);

CREATE TABLE payroll_entries (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    payroll_run_id BIGINT NOT NULL,
    employee_id BIGINT NOT NULL,
    employee_code VARCHAR(40) NOT NULL,
    employee_name VARCHAR(220) NOT NULL,
    department_name VARCHAR(120),
    designation_title VARCHAR(120),
    bank_account_number VARCHAR(80),
    annual_ctc DECIMAL(14, 2) NOT NULL DEFAULT 0,
    period_days INT NOT NULL,
    eligible_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
    working_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
    attendance_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
    paid_leave_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
    unpaid_leave_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
    payable_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
    gross_earnings DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total_deductions DECIMAL(14, 2) NOT NULL DEFAULT 0,
    employer_contributions DECIMAL(14, 2) NOT NULL DEFAULT 0,
    net_pay DECIMAL(14, 2) NOT NULL DEFAULT 0,
    component_lines_json JSON NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_payroll_entry_run_employee UNIQUE (payroll_run_id, employee_id),
    CONSTRAINT fk_payroll_entries_run FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs (id),
    CONSTRAINT fk_payroll_entries_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
);

CREATE INDEX idx_payroll_runs_org_period ON payroll_runs (org_code, period_start);
CREATE INDEX idx_payroll_entries_org_employee ON payroll_entries (org_code, employee_id);
CREATE INDEX idx_payroll_entries_run ON payroll_entries (payroll_run_id);
