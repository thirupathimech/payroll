CREATE TABLE week_off_assignments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    assignment_type VARCHAR(40) NOT NULL,
    branch_id BIGINT,
    department_id BIGINT,
    designation_id BIGINT,
    employee_id BIGINT,
    day_of_week VARCHAR(20),
    week_off_date DATE,
    PRIMARY KEY (id),
    CONSTRAINT fk_week_off_assignments_branch FOREIGN KEY (branch_id) REFERENCES branches (id),
    CONSTRAINT fk_week_off_assignments_department FOREIGN KEY (department_id) REFERENCES departments (id),
    CONSTRAINT fk_week_off_assignments_designation FOREIGN KEY (designation_id) REFERENCES designations (id),
    CONSTRAINT fk_week_off_assignments_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
);

CREATE INDEX idx_week_off_assignments_org_type ON week_off_assignments (org_code, assignment_type);
CREATE INDEX idx_week_off_assignments_org_employee ON week_off_assignments (org_code, employee_id);
CREATE INDEX idx_week_off_assignments_org_group ON week_off_assignments (org_code, branch_id, department_id, designation_id);
CREATE INDEX idx_week_off_assignments_org_date ON week_off_assignments (org_code, week_off_date);
