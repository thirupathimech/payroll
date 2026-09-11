CREATE TABLE overtime_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    org_code VARCHAR(3) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    employee_id BIGINT NOT NULL,
    overtime_date DATE NOT NULL,
    requested_minutes INT NOT NULL,
    approved_minutes INT,
    reason VARCHAR(800),
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    reviewer_comment VARCHAR(800),
    reviewed_at DATETIME(6),
    requested_by_id BIGINT NOT NULL,
    reviewed_by_id BIGINT,
    PRIMARY KEY (id),
    CONSTRAINT fk_overtime_requests_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
    CONSTRAINT fk_overtime_requests_requested_by FOREIGN KEY (requested_by_id) REFERENCES app_users (id),
    CONSTRAINT fk_overtime_requests_reviewed_by FOREIGN KEY (reviewed_by_id) REFERENCES app_users (id)
);

CREATE INDEX idx_overtime_requests_org_status ON overtime_requests (org_code, status);
CREATE INDEX idx_overtime_requests_employee_date ON overtime_requests (org_code, employee_id, overtime_date);
