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
    clock_in TIME,
    clock_out TIME,
    source VARCHAR(20) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_attendance_employee_date UNIQUE (org_code, employee_id, attendance_date),
    CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees (id)
);

CREATE INDEX idx_attendance_org_date ON attendance_records (org_code, attendance_date);
