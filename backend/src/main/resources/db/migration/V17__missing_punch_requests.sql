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
