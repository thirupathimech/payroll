CREATE TABLE app_users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    username VARCHAR(80) NOT NULL,
    email VARCHAR(160) NOT NULL,
    employee_code VARCHAR(40),
    full_name VARCHAR(160) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(40) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uk_app_users_org_username UNIQUE (org_code, username),
    CONSTRAINT uk_app_users_org_email UNIQUE (org_code, email),
    CONSTRAINT uk_app_users_org_employee_code UNIQUE (org_code, employee_code)
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

CREATE TABLE employees (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_code VARCHAR(40) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100) NULL,
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
    manager_id BIGINT NULL,    
    personal_email VARCHAR(160) NULL,
    alternate_mobile_number VARCHAR(40) NULL,
    gender VARCHAR(40) NULL,
    marital_status VARCHAR(40) NULL,
    blood_group VARCHAR(10) NULL,
    nationality VARCHAR(80) NULL,
    aadhaar_number VARCHAR(20) NULL,
    confirmation_date DATE NULL,
    employment_type VARCHAR(40) NULL,
    probation_period VARCHAR(80) NULL,
    biometric_id VARCHAR(80) NULL,
    account_holder_name VARCHAR(160) NULL,
    bank_name VARCHAR(160) NULL,
    ifsc_code VARCHAR(40) NULL,
    permanent_address VARCHAR(600) NULL,
    emergency_contact_name VARCHAR(160) NULL,
    emergency_relationship VARCHAR(80) NULL,
    emergency_mobile_number VARCHAR(40) NULL,
    primary_skill VARCHAR(120) NULL,
    secondary_skill VARCHAR(120) NULL,
    certifications VARCHAR(800) NULL,
    languages_known VARCHAR(300) NULL,
    resignation_date DATE NULL,
    last_working_date DATE NULL,
    exit_reason VARCHAR(800) NULL,
    relieving_date DATE NULL,
    hr_manager_id BIGINT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_employees_org_code UNIQUE (org_code, employee_code),
    CONSTRAINT uk_employees_org_email UNIQUE (org_code, email),
    CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments (id),
    CONSTRAINT fk_employees_designation FOREIGN KEY (designation_id) REFERENCES designations (id),
    CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id) REFERENCES employees (id),
    CONSTRAINT fk_employees_branch FOREIGN KEY (branch_id) REFERENCES branches (id),
    CONSTRAINT fk_employees_hr_manager FOREIGN KEY (hr_manager_id) REFERENCES employees (id)
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
    segments_json JSON NOT NULL,
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
    CONSTRAINT uk_week_off_group_day UNIQUE (org_code, assignment_type, branch_id, department_id, designation_id, day_of_week),
    CONSTRAINT fk_week_off_assignments_branch FOREIGN KEY (branch_id) REFERENCES branches (id),
    CONSTRAINT fk_week_off_assignments_department FOREIGN KEY (department_id) REFERENCES departments (id),
    CONSTRAINT fk_week_off_assignments_designation FOREIGN KEY (designation_id) REFERENCES designations (id),
    CONSTRAINT fk_week_off_assignments_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
);

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

CREATE INDEX idx_employees_org_status ON employees (org_code, status);
CREATE INDEX idx_employees_org_manager ON employees (org_code, manager_id);
CREATE INDEX idx_employees_org_hr_manager ON employees (org_code, hr_manager_id);
CREATE INDEX idx_employee_education_org_employee ON employee_education (org_code, employee_id);
CREATE INDEX idx_employee_experience_org_employee ON employee_experience (org_code, employee_id);
CREATE INDEX idx_employee_documents_org_employee ON employee_documents (org_code, employee_id);
CREATE INDEX idx_employee_documents_org_category ON employee_documents (org_code, employee_id, document_category);
CREATE INDEX idx_leave_requests_org_status ON leave_requests (org_code, status);
CREATE INDEX idx_leave_requests_org_dates ON leave_requests (org_code, start_date, end_date);
CREATE INDEX idx_audit_logs_org_created_at ON audit_logs (org_code, created_at);
CREATE INDEX idx_branches_org_active ON branches (org_code, active);
CREATE INDEX idx_shift_assignments_org_employee ON shift_assignments (org_code, employee_id);
CREATE INDEX idx_shift_assignments_org_date ON shift_assignments (org_code, assignment_date);
CREATE INDEX idx_week_off_assignments_org_type ON week_off_assignments (org_code, assignment_type);
CREATE INDEX idx_week_off_assignments_org_employee ON week_off_assignments (org_code, employee_id);
CREATE INDEX idx_week_off_assignments_org_group ON week_off_assignments (org_code, branch_id, department_id, designation_id);
CREATE INDEX idx_week_off_assignments_org_date ON week_off_assignments (org_code, week_off_date);
