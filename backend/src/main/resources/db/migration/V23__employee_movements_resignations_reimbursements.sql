CREATE TABLE employee_transfer_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    from_branch_id BIGINT NOT NULL,
    to_branch_id BIGINT NOT NULL,
    effective_date DATE NOT NULL,
    reason VARCHAR(800) NOT NULL,
    status VARCHAR(40) NOT NULL,
    requested_by_id BIGINT NOT NULL,
    reviewed_by_id BIGINT NULL,
    reviewed_at DATETIME(6) NULL,
    reviewer_comment VARCHAR(800) NULL,
    applied_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_transfer_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
    CONSTRAINT fk_transfer_from_branch FOREIGN KEY (from_branch_id) REFERENCES branches (id),
    CONSTRAINT fk_transfer_to_branch FOREIGN KEY (to_branch_id) REFERENCES branches (id),
    CONSTRAINT fk_transfer_requested_by FOREIGN KEY (requested_by_id) REFERENCES app_users (id),
    CONSTRAINT fk_transfer_reviewed_by FOREIGN KEY (reviewed_by_id) REFERENCES app_users (id)
);

CREATE TABLE resignation_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    resignation_date DATE NOT NULL,
    proposed_last_working_date DATE NOT NULL,
    approved_last_working_date DATE NULL,
    relieving_date DATE NULL,
    reason VARCHAR(800) NOT NULL,
    status VARCHAR(40) NOT NULL,
    requested_by_id BIGINT NOT NULL,
    reviewed_by_id BIGINT NULL,
    reviewed_at DATETIME(6) NULL,
    reviewer_comment VARCHAR(800) NULL,
    separated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_resignation_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
    CONSTRAINT fk_resignation_requested_by FOREIGN KEY (requested_by_id) REFERENCES app_users (id),
    CONSTRAINT fk_resignation_reviewed_by FOREIGN KEY (reviewed_by_id) REFERENCES app_users (id)
);

CREATE TABLE reimbursement_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    expense_date DATE NOT NULL,
    category VARCHAR(80) NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    description VARCHAR(1200) NOT NULL,
    status VARCHAR(40) NOT NULL,
    requested_by_id BIGINT NOT NULL,
    reviewed_by_id BIGINT NULL,
    reviewed_at DATETIME(6) NULL,
    reviewer_comment VARCHAR(800) NULL,
    payroll_run_id BIGINT NULL,
    paid_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_reimbursement_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
    CONSTRAINT fk_reimbursement_requested_by FOREIGN KEY (requested_by_id) REFERENCES app_users (id),
    CONSTRAINT fk_reimbursement_reviewed_by FOREIGN KEY (reviewed_by_id) REFERENCES app_users (id),
    CONSTRAINT fk_reimbursement_payroll_run FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs (id)
);

CREATE TABLE reimbursement_attachments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    reimbursement_request_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(120) NOT NULL,
    file_extension VARCHAR(20) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_at DATETIME(6) NOT NULL,
    uploaded_by VARCHAR(160) NOT NULL,
    file_data LONGBLOB NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_reimbursement_attachment_request FOREIGN KEY (reimbursement_request_id) REFERENCES reimbursement_requests (id)
);

ALTER TABLE payroll_entries
    ADD COLUMN reimbursement_amount DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER employer_contributions;

CREATE INDEX idx_transfer_org_employee_date ON employee_transfer_requests (org_code, employee_id, effective_date);
CREATE INDEX idx_transfer_org_status_date ON employee_transfer_requests (org_code, status, effective_date);
CREATE INDEX idx_resignation_org_employee ON resignation_requests (org_code, employee_id, status);
CREATE INDEX idx_resignation_org_status_lwd ON resignation_requests (org_code, status, approved_last_working_date);
CREATE INDEX idx_reimbursement_org_status_date ON reimbursement_requests (org_code, status, expense_date);
CREATE INDEX idx_reimbursement_org_employee ON reimbursement_requests (org_code, employee_id);
CREATE INDEX idx_reimbursement_org_payroll ON reimbursement_requests (org_code, payroll_run_id);
CREATE INDEX idx_reimbursement_attachment_org_request ON reimbursement_attachments (org_code, reimbursement_request_id);
