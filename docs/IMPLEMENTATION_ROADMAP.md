# Implementation Roadmap

## Phase 1 - Foundation

- Monorepo setup with `frontend/` and `backend/`
- Spring Boot layered architecture: Controller -> Service -> Repository -> MySQL
- React/Vite SaaS shell with protected routes
- Docker Compose for MySQL, backend, and frontend

Status: Complete

## Phase 2 - Core HR Modules

- Employee CRUD
- Department CRUD
- Designation CRUD
- Leave request creation and review
- Company settings
- Dashboard summaries
- Audit log viewer

Status: Complete

## Phase 3 - Compensation Setup

- Salary components: earnings, deductions, reimbursements
- Employer contribution components
- Employee CTC structures
- Salary structure reports with CSV/XLSX/PDF export

Status: Complete

## Phase 4 - Payroll Processing And Compliance

- Monthly payroll runs
- Payslip generation
- Payroll approval and payroll-lock workflow
- Employee payroll history with effective-dated salary structures
- Tax rules by country/region
- Statutory deductions
- Leave balance reports

Status: Planned

## Phase 5 - Production Hardening

- Refresh tokens
- Role and permission management UI
- Password reset flow
- Rate limiting
- Structured logging
- CI/CD pipeline
- Integration tests with Testcontainers
- Database backup strategy
- Secrets manager integration

Status: Planned

## Suggested Next Work

1. Add payroll run entities, calculation APIs, approval, and locking.
2. Add payslip generation and payroll-history snapshots.
3. Add leave balance calculations, accruals, and carry-forward rules.
4. Add secure user invitation, password reset, and session management.
5. Add automated backend integration tests and frontend component tests.
