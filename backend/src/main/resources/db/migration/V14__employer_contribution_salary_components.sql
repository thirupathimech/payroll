-- EMPLOYER_CONTRIBUTION is 21 characters, while V13 originally allowed 20.
ALTER TABLE salary_components
    MODIFY COLUMN category VARCHAR(32) NOT NULL;

-- Add optional templates to every existing salary-component catalog. They remain master-enabled
-- so HR can opt an employee into them; the API defaults an absent employee row to disabled so
-- existing employee structures, whose enabled earnings already total their CTC, stay valid.
-- The application also creates these idempotently for catalogs made after this migration.
INSERT INTO salary_components (
    org_code,
    created_at,
    updated_at,
    name,
    code,
    category,
    value_type,
    default_value,
    enabled
)
SELECT existing_org.org_code,
       CURRENT_TIMESTAMP(6),
       CURRENT_TIMESTAMP(6),
       'Employer Provident Fund',
       'EMPLOYER_PF',
       'EMPLOYER_CONTRIBUTION',
       'PERCENTAGE',
       0.00,
       TRUE
FROM (
    SELECT DISTINCT org_code
    FROM salary_components
) AS existing_org
LEFT JOIN salary_components AS existing_component
    ON existing_component.org_code = existing_org.org_code
   AND UPPER(existing_component.code) = 'EMPLOYER_PF'
WHERE existing_component.id IS NULL;

INSERT INTO salary_components (
    org_code,
    created_at,
    updated_at,
    name,
    code,
    category,
    value_type,
    default_value,
    enabled
)
SELECT existing_org.org_code,
       CURRENT_TIMESTAMP(6),
       CURRENT_TIMESTAMP(6),
       'Employer State Insurance',
       'EMPLOYER_ESI',
       'EMPLOYER_CONTRIBUTION',
       'PERCENTAGE',
       0.00,
       TRUE
FROM (
    SELECT DISTINCT org_code
    FROM salary_components
) AS existing_org
LEFT JOIN salary_components AS existing_component
    ON existing_component.org_code = existing_org.org_code
   AND UPPER(existing_component.code) = 'EMPLOYER_ESI'
WHERE existing_component.id IS NULL;
