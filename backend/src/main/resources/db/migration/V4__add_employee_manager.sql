ALTER TABLE employees
    ADD COLUMN manager_id BIGINT NULL;

ALTER TABLE employees
    ADD CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id) REFERENCES employees (id);

CREATE INDEX idx_employees_org_manager ON employees (org_code, manager_id);
