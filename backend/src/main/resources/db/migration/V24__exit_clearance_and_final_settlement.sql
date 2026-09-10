ALTER TABLE resignation_requests
    ADD COLUMN asset_clearance_completed_at DATETIME(6) NULL AFTER separated_at,
    ADD COLUMN asset_clearance_completed_by VARCHAR(160) NULL AFTER asset_clearance_completed_at;

CREATE TABLE asset_catalog_items (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(80) NULL,
    returnable TINYINT(1) NOT NULL,
    default_recovery_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
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
    asset_category VARCHAR(80) NULL,
    returnable TINYINT(1) NOT NULL,
    released_on DATE NOT NULL,
    return_status VARCHAR(32) NOT NULL,
    returned_on DATE NULL,
    recovery_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    condition_note VARCHAR(800) NULL,
    verified_by VARCHAR(160) NULL,
    verified_at DATETIME(6) NULL,
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
    leave_encashment_days DECIMAL(8,2) NOT NULL DEFAULT 0,
    leave_encashment_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    notice_pay_recovery DECIMAL(14,2) NOT NULL DEFAULT 0,
    other_earnings DECIMAL(14,2) NOT NULL DEFAULT 0,
    other_deductions DECIMAL(14,2) NOT NULL DEFAULT 0,
    remarks VARCHAR(1200) NULL,
    settled TINYINT(1) NOT NULL DEFAULT 0,
    settled_on DATE NULL,
    settled_by VARCHAR(160) NULL,
    settled_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_final_settlement_resignation UNIQUE (resignation_request_id),
    CONSTRAINT fk_final_settlement_resignation FOREIGN KEY (resignation_request_id) REFERENCES resignation_requests (id)
);

CREATE INDEX idx_asset_catalog_org_active ON asset_catalog_items (org_code, active, name);
CREATE INDEX idx_asset_release_org_resignation ON employee_asset_releases (org_code, resignation_request_id);
CREATE INDEX idx_final_settlement_org_resignation ON final_settlements (org_code, resignation_request_id);
