CREATE TABLE employee_leave_entitlements (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    leave_type VARCHAR(40) NOT NULL,
    leave_year INT NOT NULL,
    allocated_minutes INT NOT NULL DEFAULT 0,
    carried_forward_minutes INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_leave_entitlement_employee_type_year UNIQUE (org_code, employee_id, leave_type, leave_year),
    CONSTRAINT fk_leave_entitlement_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
);

CREATE INDEX idx_leave_entitlements_org_employee_year
    ON employee_leave_entitlements (org_code, employee_id, leave_year);
