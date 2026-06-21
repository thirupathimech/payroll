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

## Phase 3 - Payroll Processing

- Salary components: earnings, deductions, reimbursements
- Monthly payroll runs
- Payslip generation
- Payroll approval workflow
- Employee payroll history

Status: Planned

## Phase 4 - Compliance And Reporting

- Tax rules by country/region
- Statutory deductions
- Export reports as CSV/PDF
- Department-wise payroll reports
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

1. Add payroll run entities and APIs.
2. Add payslip PDF generation.
3. Add leave balance calculations.
4. Add user management for HR, manager, and employee users.
5. Add automated backend integration tests and frontend component tests.
