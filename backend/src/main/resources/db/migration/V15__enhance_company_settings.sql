ALTER TABLE company_settings
    MODIFY COLUMN address VARCHAR(1200) NULL,
    ADD COLUMN website VARCHAR(160) NULL,
    ADD COLUMN registration_number VARCHAR(80) NULL,
    ADD COLUMN gstin VARCHAR(20) NULL,
    ADD COLUMN pan_number VARCHAR(20) NULL,
    ADD COLUMN address_line1 VARCHAR(250) NULL,
    ADD COLUMN address_line2 VARCHAR(250) NULL,
    ADD COLUMN city VARCHAR(100) NULL,
    ADD COLUMN state VARCHAR(100) NULL,
    ADD COLUMN postal_code VARCHAR(20) NULL,
    ADD COLUMN country VARCHAR(80) NULL,
    ADD COLUMN payroll_frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    ADD COLUMN payroll_disbursement_day INT NOT NULL DEFAULT 1,
    ADD COLUMN week_start_day VARCHAR(20) NOT NULL DEFAULT 'MONDAY';

UPDATE company_settings
SET address_line1 = address
WHERE address_line1 IS NULL AND address IS NOT NULL AND address <> '';
