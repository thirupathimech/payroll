ALTER TABLE employees
    ADD COLUMN middle_name VARCHAR(100) NULL,
    ADD COLUMN personal_email VARCHAR(160) NULL,
    ADD COLUMN alternate_mobile_number VARCHAR(40) NULL,
    ADD COLUMN gender VARCHAR(40) NULL,
    ADD COLUMN marital_status VARCHAR(40) NULL,
    ADD COLUMN blood_group VARCHAR(10) NULL,
    ADD COLUMN nationality VARCHAR(80) NULL,
    ADD COLUMN aadhaar_number VARCHAR(20) NULL,
    ADD COLUMN confirmation_date DATE NULL,
    ADD COLUMN employment_type VARCHAR(40) NULL,
    ADD COLUMN probation_period VARCHAR(80) NULL,
    ADD COLUMN biometric_id VARCHAR(80) NULL,
    ADD COLUMN account_holder_name VARCHAR(160) NULL,
    ADD COLUMN bank_name VARCHAR(160) NULL,
    ADD COLUMN ifsc_code VARCHAR(40) NULL,
    ADD COLUMN permanent_address VARCHAR(600) NULL,
    ADD COLUMN emergency_contact_name VARCHAR(160) NULL,
    ADD COLUMN emergency_relationship VARCHAR(80) NULL,
    ADD COLUMN emergency_mobile_number VARCHAR(40) NULL,
    ADD COLUMN primary_skill VARCHAR(120) NULL,
    ADD COLUMN secondary_skill VARCHAR(120) NULL,
    ADD COLUMN certifications VARCHAR(800) NULL,
    ADD COLUMN languages_known VARCHAR(300) NULL,
    ADD COLUMN resignation_date DATE NULL,
    ADD COLUMN last_working_date DATE NULL,
    ADD COLUMN exit_reason VARCHAR(800) NULL,
    ADD COLUMN relieving_date DATE NULL,
    ADD COLUMN hr_manager_id BIGINT NULL;

ALTER TABLE employees
    ADD CONSTRAINT fk_employees_hr_manager FOREIGN KEY (hr_manager_id) REFERENCES employees (id);

CREATE INDEX idx_employees_org_hr_manager ON employees (org_code, hr_manager_id);
