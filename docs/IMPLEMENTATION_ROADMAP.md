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

- Monthly payroll runs with joining/last-working-day and approved-unpaid-leave proration
- Payslip generation from immutable payroll snapshots
- Payroll approval and payroll-lock workflow
- Employee payroll history from approved or locked payroll runs
- Tax rules by country/region
- Statutory deductions
- Leave balance reports

Status: In progress (payroll run, payslip, approval, lock, and history complete; regional tax rules and statutory policy configuration remain planned)

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

1. Add country/region statutory rules and configurable attendance loss-of-pay policy.
2. Add leave balance calculations, accruals, and carry-forward rules.
3. Add secure user invitation, password reset, and session management.
4. Add automated backend integration tests and frontend component tests.
