CREATE TABLE week_off_exclusions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    branch_id BIGINT NOT NULL,
    department_id BIGINT NOT NULL,
    designation_id BIGINT NOT NULL,
    excluded_date DATE NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_week_off_exclusion_scope_date UNIQUE (org_code, branch_id, department_id, designation_id, excluded_date),
    CONSTRAINT fk_week_off_exclusion_branch FOREIGN KEY (branch_id) REFERENCES branches (id),
    CONSTRAINT fk_week_off_exclusion_department FOREIGN KEY (department_id) REFERENCES departments (id),
    CONSTRAINT fk_week_off_exclusion_designation FOREIGN KEY (designation_id) REFERENCES designations (id)
);
CREATE INDEX idx_week_off_exclusions_org_date ON week_off_exclusions (org_code, excluded_date);
