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
    CONSTRAINT uk_branches_org_name UNIQUE (org_code, name),
    CONSTRAINT uk_branches_org_code UNIQUE (org_code, code)
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
    start_time TIME NOT NULL DEFAULT '00:00:00',
    end_time TIME NOT NULL DEFAULT '00:00:00',
    leave_minutes INT NOT NULL DEFAULT 0,
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
    address VARCHAR(1200),
    currency VARCHAR(10) NOT NULL,
    timezone VARCHAR(80) NOT NULL,
    payroll_cutoff_day INT NOT NULL,
    website VARCHAR(160),
    registration_number VARCHAR(80),
    gstin VARCHAR(20),
    pan_number VARCHAR(20),
    address_line1 VARCHAR(250),
    address_line2 VARCHAR(250),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(80),
    payroll_frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    payroll_disbursement_day INT NOT NULL DEFAULT 1,
    week_start_day VARCHAR(20) NOT NULL DEFAULT 'MONDAY',
    logo_data MEDIUMBLOB,
    logo_content_type VARCHAR(40),
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

CREATE TABLE attendance_settings (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    attendance_mode VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    biometric_name VARCHAR(120),
    biometric_url VARCHAR(300),
    biometric_api_key VARCHAR(300),
    PRIMARY KEY (id),
    CONSTRAINT uk_attendance_settings_org UNIQUE (org_code)
);

CREATE TABLE attendance_records (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    attendance_date DATE NOT NULL,
    clock_in_date DATE,
    clock_out_date DATE,
    clock_in TIME,
    clock_out TIME,
    source VARCHAR(20) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_attendance_employee_date UNIQUE (org_code, employee_id, attendance_date),
    CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
);

CREATE INDEX idx_attendance_org_date ON attendance_records (org_code, attendance_date);

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

CREATE TABLE salary_components (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(40) NOT NULL,
    category VARCHAR(32) NOT NULL,
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

CREATE TABLE missing_punch_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    punch_date DATE NOT NULL,
    punch_time TIME NOT NULL,
    punch_type VARCHAR(10) NOT NULL,
    remark VARCHAR(800) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    reviewer_comment VARCHAR(800),
    reviewed_at DATETIME(6),
    reviewed_by_id BIGINT,
    PRIMARY KEY (id),
    CONSTRAINT fk_missing_punch_requests_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
    CONSTRAINT fk_missing_punch_requests_reviewer FOREIGN KEY (reviewed_by_id) REFERENCES app_users (id)
);

CREATE INDEX idx_missing_punch_org_status ON missing_punch_requests (org_code, status);
CREATE INDEX idx_missing_punch_employee_date ON missing_punch_requests (org_code, employee_id, punch_date);

CREATE TABLE payroll_runs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    period_year INT NOT NULL,
    period_month INT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    payroll_frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    disbursement_date DATE,
    created_by VARCHAR(160),
    status VARCHAR(20) NOT NULL,
    employee_count INT NOT NULL DEFAULT 0,
    gross_earnings DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total_deductions DECIMAL(14, 2) NOT NULL DEFAULT 0,
    employer_contributions DECIMAL(14, 2) NOT NULL DEFAULT 0,
    net_pay DECIMAL(14, 2) NOT NULL DEFAULT 0,
    approved_by VARCHAR(160),
    approved_at DATETIME(6),
    locked_by VARCHAR(160),
    locked_at DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_payroll_run_org_dates UNIQUE (org_code, period_start, period_end)
);

CREATE TABLE payroll_entries (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    payroll_run_id BIGINT NOT NULL,
    employee_id BIGINT NOT NULL,
    employee_code VARCHAR(40) NOT NULL,
    employee_name VARCHAR(220) NOT NULL,
    department_name VARCHAR(120),
    designation_title VARCHAR(120),
    bank_account_number VARCHAR(80),
    annual_ctc DECIMAL(14, 2) NOT NULL DEFAULT 0,
    period_days INT NOT NULL,
    eligible_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
    working_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
    attendance_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
    paid_leave_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
    unpaid_leave_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
    payable_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
    gross_earnings DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total_deductions DECIMAL(14, 2) NOT NULL DEFAULT 0,
    employer_contributions DECIMAL(14, 2) NOT NULL DEFAULT 0,
    reimbursement_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    net_pay DECIMAL(14, 2) NOT NULL DEFAULT 0,
    component_lines_json JSON NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_payroll_entry_run_employee UNIQUE (payroll_run_id, employee_id),
    CONSTRAINT fk_payroll_entries_run FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs (id),
    CONSTRAINT fk_payroll_entries_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
);

CREATE INDEX idx_payroll_runs_org_period ON payroll_runs (org_code, period_start);
CREATE INDEX idx_payroll_entries_org_employee ON payroll_entries (org_code, employee_id);
CREATE INDEX idx_payroll_entries_run ON payroll_entries (payroll_run_id);

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

CREATE TABLE employee_transfer_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    from_branch_id BIGINT NOT NULL,
    to_branch_id BIGINT NOT NULL,
    effective_date DATE NOT NULL,
    reason VARCHAR(800) NOT NULL,
    status VARCHAR(40) NOT NULL,
    requested_by_id BIGINT NOT NULL,
    reviewed_by_id BIGINT,
    reviewed_at DATETIME(6),
    reviewer_comment VARCHAR(800),
    applied_at DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_transfer_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
    CONSTRAINT fk_transfer_from_branch FOREIGN KEY (from_branch_id) REFERENCES branches (id),
    CONSTRAINT fk_transfer_to_branch FOREIGN KEY (to_branch_id) REFERENCES branches (id),
    CONSTRAINT fk_transfer_requested_by FOREIGN KEY (requested_by_id) REFERENCES app_users (id),
    CONSTRAINT fk_transfer_reviewed_by FOREIGN KEY (reviewed_by_id) REFERENCES app_users (id)
);

CREATE TABLE resignation_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    resignation_date DATE NOT NULL,
    proposed_last_working_date DATE NOT NULL,
    approved_last_working_date DATE,
    relieving_date DATE,
    reason VARCHAR(800) NOT NULL,
    status VARCHAR(40) NOT NULL,
    requested_by_id BIGINT NOT NULL,
    reviewed_by_id BIGINT,
    reviewed_at DATETIME(6),
    reviewer_comment VARCHAR(800),
    separated_at DATETIME(6),
    asset_clearance_completed_at DATETIME(6),
    asset_clearance_completed_by VARCHAR(160),
    PRIMARY KEY (id),
    CONSTRAINT fk_resignation_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
    CONSTRAINT fk_resignation_requested_by FOREIGN KEY (requested_by_id) REFERENCES app_users (id),
    CONSTRAINT fk_resignation_reviewed_by FOREIGN KEY (reviewed_by_id) REFERENCES app_users (id)
);

CREATE TABLE reimbursement_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    expense_date DATE NOT NULL,
    category VARCHAR(80) NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    description VARCHAR(1200) NOT NULL,
    status VARCHAR(40) NOT NULL,
    requested_by_id BIGINT NOT NULL,
    reviewed_by_id BIGINT,
    reviewed_at DATETIME(6),
    reviewer_comment VARCHAR(800),
    payroll_run_id BIGINT,
    paid_at DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_reimbursement_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
    CONSTRAINT fk_reimbursement_requested_by FOREIGN KEY (requested_by_id) REFERENCES app_users (id),
    CONSTRAINT fk_reimbursement_reviewed_by FOREIGN KEY (reviewed_by_id) REFERENCES app_users (id),
    CONSTRAINT fk_reimbursement_payroll_run FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs (id)
);

CREATE TABLE reimbursement_attachments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    reimbursement_request_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(120) NOT NULL,
    file_extension VARCHAR(20) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_at DATETIME(6) NOT NULL,
    uploaded_by VARCHAR(160) NOT NULL,
    file_data LONGBLOB NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_reimbursement_attachment_request FOREIGN KEY (reimbursement_request_id) REFERENCES reimbursement_requests (id)
);

CREATE INDEX idx_transfer_org_employee_date ON employee_transfer_requests (org_code, employee_id, effective_date);
CREATE INDEX idx_transfer_org_status_date ON employee_transfer_requests (org_code, status, effective_date);
CREATE INDEX idx_resignation_org_employee ON resignation_requests (org_code, employee_id, status);
CREATE INDEX idx_resignation_org_status_lwd ON resignation_requests (org_code, status, approved_last_working_date);
CREATE INDEX idx_reimbursement_org_status_date ON reimbursement_requests (org_code, status, expense_date);
CREATE INDEX idx_reimbursement_org_employee ON reimbursement_requests (org_code, employee_id);
CREATE INDEX idx_reimbursement_org_payroll ON reimbursement_requests (org_code, payroll_run_id);
CREATE INDEX idx_reimbursement_attachment_org_request ON reimbursement_attachments (org_code, reimbursement_request_id);

CREATE TABLE asset_catalog_items (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(80),
    returnable TINYINT(1) NOT NULL,
    default_recovery_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
);

CREATE TABLE employee_asset_releases (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    resignation_request_id BIGINT NOT NULL,
    asset_catalog_item_id BIGINT NOT NULL,
    asset_name VARCHAR(120) NOT NULL,
    asset_category VARCHAR(80),
    returnable TINYINT(1) NOT NULL,
    released_on DATE NOT NULL,
    return_status VARCHAR(32) NOT NULL,
    returned_on DATE,
    recovery_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    condition_note VARCHAR(800),
    verified_by VARCHAR(160),
    verified_at DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_asset_release_resignation FOREIGN KEY (resignation_request_id) REFERENCES resignation_requests (id),
    CONSTRAINT fk_asset_release_catalog FOREIGN KEY (asset_catalog_item_id) REFERENCES asset_catalog_items (id)
);

CREATE TABLE final_settlements (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    resignation_request_id BIGINT NOT NULL,
    leave_encashment_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
    leave_encashment_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    notice_pay_recovery DECIMAL(14, 2) NOT NULL DEFAULT 0,
    other_earnings DECIMAL(14, 2) NOT NULL DEFAULT 0,
    other_deductions DECIMAL(14, 2) NOT NULL DEFAULT 0,
    remarks VARCHAR(1200),
    settled TINYINT(1) NOT NULL DEFAULT 0,
    settled_on DATE,
    settled_by VARCHAR(160),
    settled_at DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_final_settlement_resignation UNIQUE (resignation_request_id),
    CONSTRAINT fk_final_settlement_resignation FOREIGN KEY (resignation_request_id) REFERENCES resignation_requests (id)
);

CREATE INDEX idx_asset_catalog_org_active ON asset_catalog_items (org_code, active, name);
CREATE INDEX idx_asset_release_org_resignation ON employee_asset_releases (org_code, resignation_request_id);
CREATE INDEX idx_final_settlement_org_resignation ON final_settlements (org_code, resignation_request_id);
