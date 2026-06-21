CREATE TABLE app_users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    email VARCHAR(160) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(40) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uk_app_users_email UNIQUE (email)
);

CREATE TABLE departments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(30) NOT NULL,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uk_departments_name UNIQUE (name),
    CONSTRAINT uk_departments_code UNIQUE (code)
);

CREATE TABLE designations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    title VARCHAR(120) NOT NULL,
    code VARCHAR(30) NOT NULL,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    department_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_designations_code UNIQUE (code),
    CONSTRAINT fk_designations_department FOREIGN KEY (department_id) REFERENCES departments (id)
);

CREATE TABLE employees (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_code VARCHAR(40) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(160) NOT NULL,
    phone VARCHAR(40),
    date_of_birth DATE,
    joining_date DATE NOT NULL,
    base_salary DECIMAL(14, 2) NOT NULL,
    bank_account_number VARCHAR(80),
    tax_identification_number VARCHAR(80),
    address VARCHAR(600),
    status VARCHAR(40) NOT NULL,
    department_id BIGINT NOT NULL,
    designation_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_employees_code UNIQUE (employee_code),
    CONSTRAINT uk_employees_email UNIQUE (email),
    CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments (id),
    CONSTRAINT fk_employees_designation FOREIGN KEY (designation_id) REFERENCES designations (id)
);

CREATE TABLE leave_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    leave_type VARCHAR(40) NOT NULL,
    status VARCHAR(40) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(800) NOT NULL,
    reviewer_comment VARCHAR(800),
    reviewed_at DATETIME(6),
    employee_id BIGINT NOT NULL,
    reviewed_by_id BIGINT,
    PRIMARY KEY (id),
    CONSTRAINT fk_leave_requests_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
    CONSTRAINT fk_leave_requests_reviewer FOREIGN KEY (reviewed_by_id) REFERENCES app_users (id)
);

CREATE TABLE company_settings (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    company_name VARCHAR(180) NOT NULL,
    legal_name VARCHAR(220),
    tax_id VARCHAR(80),
    email VARCHAR(160),
    phone VARCHAR(40),
    address VARCHAR(700),
    currency VARCHAR(10) NOT NULL,
    timezone VARCHAR(80) NOT NULL,
    payroll_cutoff_day INT NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE audit_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    actor_email VARCHAR(160),
    action VARCHAR(120) NOT NULL,
    entity_name VARCHAR(120),
    entity_id VARCHAR(80),
    details VARCHAR(1200),
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX idx_employees_status ON employees (status);
CREATE INDEX idx_leave_requests_status ON leave_requests (status);
CREATE INDEX idx_leave_requests_dates ON leave_requests (start_date, end_date);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
