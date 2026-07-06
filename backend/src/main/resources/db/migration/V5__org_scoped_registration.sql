ALTER TABLE app_users ADD COLUMN org_code VARCHAR(3) NOT NULL DEFAULT 'LEG' AFTER id;
ALTER TABLE departments ADD COLUMN org_code VARCHAR(3) NOT NULL DEFAULT 'LEG' AFTER id;
ALTER TABLE designations ADD COLUMN org_code VARCHAR(3) NOT NULL DEFAULT 'LEG' AFTER id;
ALTER TABLE employees ADD COLUMN org_code VARCHAR(3) NOT NULL DEFAULT 'LEG' AFTER id;
ALTER TABLE leave_requests ADD COLUMN org_code VARCHAR(3) NOT NULL DEFAULT 'LEG' AFTER id;
ALTER TABLE company_settings ADD COLUMN org_code VARCHAR(3) NOT NULL DEFAULT 'LEG' AFTER id;
ALTER TABLE audit_logs ADD COLUMN org_code VARCHAR(3) NOT NULL DEFAULT 'LEG' AFTER id;
ALTER TABLE employee_documents ADD COLUMN org_code VARCHAR(3) NOT NULL DEFAULT 'LEG' AFTER id;

ALTER TABLE app_users DROP INDEX uk_app_users_email;
ALTER TABLE departments DROP INDEX uk_departments_name;
ALTER TABLE departments DROP INDEX uk_departments_code;
ALTER TABLE designations DROP INDEX uk_designations_code;
ALTER TABLE employees DROP INDEX uk_employees_code;
ALTER TABLE employees DROP INDEX uk_employees_email;

ALTER TABLE app_users ADD CONSTRAINT uk_app_users_org_email UNIQUE (org_code, email);
ALTER TABLE departments ADD CONSTRAINT uk_departments_org_name UNIQUE (org_code, name);
ALTER TABLE departments ADD CONSTRAINT uk_departments_org_code UNIQUE (org_code, code);
ALTER TABLE designations ADD CONSTRAINT uk_designations_org_code UNIQUE (org_code, code);
ALTER TABLE employees ADD CONSTRAINT uk_employees_org_code UNIQUE (org_code, employee_code);
ALTER TABLE employees ADD CONSTRAINT uk_employees_org_email UNIQUE (org_code, email);
ALTER TABLE company_settings ADD CONSTRAINT uk_company_settings_org UNIQUE (org_code);

CREATE INDEX idx_leave_requests_org_status ON leave_requests (org_code, status);
CREATE INDEX idx_leave_requests_org_dates ON leave_requests (org_code, start_date, end_date);
CREATE INDEX idx_audit_logs_org_created_at ON audit_logs (org_code, created_at);
CREATE INDEX idx_employee_documents_org_employee ON employee_documents (org_code, employee_id);
