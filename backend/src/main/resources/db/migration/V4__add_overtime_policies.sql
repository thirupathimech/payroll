CREATE TABLE overtime_policies (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    branch_id BIGINT NOT NULL,
    department_id BIGINT NOT NULL,
    designation_id BIGINT NOT NULL,
    hourly_rate DECIMAL(14, 2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uk_overtime_policy_scope UNIQUE (org_code, branch_id, department_id, designation_id),
    CONSTRAINT fk_overtime_policy_branch FOREIGN KEY (branch_id) REFERENCES branches (id),
    CONSTRAINT fk_overtime_policy_department FOREIGN KEY (department_id) REFERENCES departments (id),
    CONSTRAINT fk_overtime_policy_designation FOREIGN KEY (designation_id) REFERENCES designations (id)
);

CREATE INDEX idx_overtime_policies_org_active ON overtime_policies (org_code, active);

ALTER TABLE overtime_requests
    ADD COLUMN approved_hourly_rate DECIMAL(14, 2);
