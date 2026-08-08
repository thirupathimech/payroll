CREATE TABLE holidays (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    branch_id BIGINT NOT NULL,
    department_id BIGINT NOT NULL,
    designation_id BIGINT NOT NULL,
    holiday_date DATE NOT NULL,
    title VARCHAR(160) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_holiday_scope_date UNIQUE (org_code, branch_id, department_id, designation_id, holiday_date),
    CONSTRAINT fk_holiday_branch FOREIGN KEY (branch_id) REFERENCES branches (id),
    CONSTRAINT fk_holiday_department FOREIGN KEY (department_id) REFERENCES departments (id),
    CONSTRAINT fk_holiday_designation FOREIGN KEY (designation_id) REFERENCES designations (id)
);

CREATE INDEX idx_holidays_org_date ON holidays (org_code, holiday_date);
