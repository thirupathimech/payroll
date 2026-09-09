CREATE TABLE employee_salary_revisions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    effective_date DATE NOT NULL,
    annual_ctc DECIMAL(14, 2) NOT NULL,
    reason VARCHAR(600),
    created_by VARCHAR(160) NOT NULL,
    components_json JSON NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_salary_revision_employee_effective UNIQUE (org_code, employee_id, effective_date),
    CONSTRAINT fk_salary_revision_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
);

CREATE INDEX idx_salary_revisions_org_employee_date
    ON employee_salary_revisions (org_code, employee_id, effective_date);
