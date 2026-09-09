-- Preserve the current package of every existing employee as their opening
-- revision. New installations simply insert no rows here until a salary is set.
INSERT INTO employee_salary_revisions (
    org_code, created_at, updated_at, employee_id, effective_date, annual_ctc,
    reason, created_by, components_json
)
SELECT
    employee.org_code,
    CURRENT_TIMESTAMP(6),
    CURRENT_TIMESTAMP(6),
    employee.id,
    employee.joining_date,
    employee.base_salary,
    'Opening salary package (migrated from existing record)',
    'SYSTEM_MIGRATION',
    COALESCE(component_snapshot.components_json, JSON_ARRAY())
FROM employees employee
LEFT JOIN (
    SELECT
        employee_component.org_code,
        employee_component.employee_id,
        JSON_ARRAYAGG(JSON_OBJECT(
            'componentId', component.id,
            'name', component.name,
            'code', component.code,
            'category', component.category,
            'valueType', employee_component.value_type,
            'value', employee_component.component_value,
            'enabled', employee_component.enabled
        )) AS components_json
    FROM employee_salary_components employee_component
    INNER JOIN salary_components component ON component.id = employee_component.component_id
    GROUP BY employee_component.org_code, employee_component.employee_id
) component_snapshot
    ON component_snapshot.org_code = employee.org_code
    AND component_snapshot.employee_id = employee.id
WHERE NOT EXISTS (
    SELECT 1
    FROM employee_salary_revisions revision
    WHERE revision.org_code = employee.org_code
      AND revision.employee_id = employee.id
);
