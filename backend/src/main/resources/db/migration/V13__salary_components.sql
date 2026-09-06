CREATE TABLE salary_components (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(40) NOT NULL,
    category VARCHAR(20) NOT NULL,
    value_type VARCHAR(20) NOT NULL,
    default_value DECIMAL(14, 2) NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uk_salary_components_org_code UNIQUE (org_code, code)
);

CREATE TABLE employee_salary_components (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    component_id BIGINT NOT NULL,
    value_type VARCHAR(20) NOT NULL,
    component_value DECIMAL(14, 2) NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uk_employee_salary_component UNIQUE (org_code, employee_id, component_id),
    CONSTRAINT fk_employee_salary_components_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
    CONSTRAINT fk_employee_salary_components_component FOREIGN KEY (component_id) REFERENCES salary_components (id)
);

CREATE INDEX idx_employee_salary_components_org_employee ON employee_salary_components (org_code, employee_id);
