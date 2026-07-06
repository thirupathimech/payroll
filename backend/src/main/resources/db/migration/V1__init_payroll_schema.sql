CREATE TABLE app_users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    email VARCHAR(160) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(40) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uk_app_users_org_email UNIQUE (org_code, email)
);

CREATE TABLE departments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(30) NOT NULL,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uk_departments_org_name UNIQUE (org_code, name),
    CONSTRAINT uk_departments_org_code UNIQUE (org_code, code)
);

CREATE TABLE designations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    title VARCHAR(120) NOT NULL,
    code VARCHAR(30) NOT NULL,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    department_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_designations_org_code UNIQUE (org_code, code),
    CONSTRAINT fk_designations_department FOREIGN KEY (department_id) REFERENCES departments (id)
);

CREATE TABLE employees (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
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
    branch_id BIGINT,
    status VARCHAR(40) NOT NULL,
    department_id BIGINT NOT NULL,
    designation_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_employees_org_code UNIQUE (org_code, employee_code),
    CONSTRAINT uk_employees_org_email UNIQUE (org_code, email),
    CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments (id),
    CONSTRAINT fk_employees_designation FOREIGN KEY (designation_id) REFERENCES designations (id)
);

CREATE TABLE leave_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
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
    org_code VARCHAR(3) NOT NULL,
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
    PRIMARY KEY (id),
    CONSTRAINT uk_company_settings_org UNIQUE (org_code)
);

CREATE TABLE audit_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    actor_email VARCHAR(160),
    action VARCHAR(120) NOT NULL,
    entity_name VARCHAR(120),
    entity_id VARCHAR(80),
    details VARCHAR(1200),
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE employee_documents (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(120) NOT NULL,
    file_extension VARCHAR(20) NOT NULL,
    file_size BIGINT NOT NULL,
    document_category VARCHAR(80) NOT NULL,
    uploaded_at DATETIME(6) NOT NULL,
    uploaded_by VARCHAR(160) NOT NULL,
    profile_photo BOOLEAN NOT NULL DEFAULT FALSE,
    file_data LONGBLOB NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_employee_documents_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
);

CREATE TABLE branches (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(30),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uk_branches_org_name UNIQUE (org_code, name)
);

ALTER TABLE employees
    ADD CONSTRAINT fk_employees_branch FOREIGN KEY (branch_id) REFERENCES branches (id);

CREATE TABLE employee_settings (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    code_mode VARCHAR(20) NOT NULL,
    prefix_value VARCHAR(30) NOT NULL,
    suffix_value VARCHAR(30),
    starting_number INT NOT NULL,
    number_padding INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_employee_settings_org UNIQUE (org_code)
);

CREATE TABLE shifts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(30) NOT NULL,
    start_time TIME NOT NULL,
    duration_hours INT NOT NULL,
    duration_minutes INT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uk_shifts_org_code UNIQUE (org_code, code)
);

CREATE TABLE shift_assignments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    shift_id BIGINT NOT NULL,
    assignment_date DATE NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_shift_assignments_org_employee_date UNIQUE (org_code, employee_id, assignment_date),
    CONSTRAINT fk_shift_assignments_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
    CONSTRAINT fk_shift_assignments_shift FOREIGN KEY (shift_id) REFERENCES shifts (id)
);

CREATE INDEX idx_employees_org_status ON employees (org_code, status);
CREATE INDEX idx_leave_requests_org_status ON leave_requests (org_code, status);
CREATE INDEX idx_leave_requests_org_dates ON leave_requests (org_code, start_date, end_date);
CREATE INDEX idx_audit_logs_org_created_at ON audit_logs (org_code, created_at);
CREATE INDEX idx_employee_documents_org_employee ON employee_documents (org_code, employee_id);
CREATE INDEX idx_employee_documents_org_category ON employee_documents (org_code, employee_id, document_category);
CREATE INDEX idx_branches_org_active ON branches (org_code, active);
CREATE INDEX idx_shift_assignments_org_employee ON shift_assignments (org_code, employee_id);
CREATE INDEX idx_shift_assignments_org_date ON shift_assignments (org_code, assignment_date);
