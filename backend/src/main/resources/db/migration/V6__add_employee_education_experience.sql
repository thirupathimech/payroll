CREATE TABLE employee_education (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    qualification VARCHAR(160),
    institution VARCHAR(160),
    university VARCHAR(160),
    year_of_passing VARCHAR(40),
    score VARCHAR(40),
    specialization VARCHAR(160),
    PRIMARY KEY (id),
    CONSTRAINT fk_employee_education_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
);

CREATE INDEX idx_employee_education_org_employee ON employee_education (org_code, employee_id);

CREATE TABLE employee_experience (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    company VARCHAR(160),
    designation VARCHAR(160),
    start_date DATE,
    end_date DATE,
    total_experience VARCHAR(40),
    last_drawn_salary VARCHAR(80),
    reason_for_leaving VARCHAR(800),
    PRIMARY KEY (id),
    CONSTRAINT fk_employee_experience_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
);

CREATE INDEX idx_employee_experience_org_employee ON employee_experience (org_code, employee_id);
