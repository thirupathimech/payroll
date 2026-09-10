# Payroll Management System

Modern enterprise-grade payroll monorepo with:

- `frontend/` - React + Vite + TypeScript + Tailwind CSS SaaS UI
- `backend/` - Spring Boot 3 + Java 17 + Spring Security JWT + JPA
- `docker-compose.yml` - MySQL, backend API, and frontend web app

## Quick Run With Docker

```powershell
docker compose up --build
```

Open:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html

Use the Register option on the login page to create the first organization. Registration generates a three-letter org code that is required for future logins.

## Run Separately

- Backend instructions: [backend/README.md](backend/README.md)
- Frontend instructions: [frontend/README.md](frontend/README.md)

## Project Structure

```text
payroll/
├── backend/
│   ├── src/main/java/com/payroll/backend/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── domain/
│   │   ├── dto/
│   │   ├── security/
│   │   ├── exception/
│   │   ├── audit/
│   │   └── config/
│   └── src/main/resources/db/migration/
├── frontend/
│   └── src/
│       ├── api/
│       ├── auth/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── pages/
│       └── types/
├── docs/
└── docker-compose.yml
```

## Features Implemented

- JWT authentication and authorization
- Organization registration with three-letter org code login
- Org-scoped data isolation across application tables
- Employee management
- Effective-dated branch-transfer requests with HR approval and transfer history
- Resignation requests with final working/relieving-date approval and payroll-safe separation
- Reimbursement requests with receipt attachments, review, payroll allocation, and paid-state audit trail
- Employee documents, profile photos, experience, education, and reporting hierarchy
- Branch, department, designation, and user management
- Shift definitions and employee shift assignments
- Attendance punches, including overnight shifts
- Holiday, week-off, and week-off exclusion management
- Shift-aware leave management with approval flow
- Salary components and employee CTC structures
- Monthly payroll runs with proration, approval, locking, immutable payslips, and employee payroll history
- Calendar-off, shift-assignment, attendance-punch, and salary reports with CSV/XLSX/PDF export
- Company and employee-code settings
- Dashboard summaries
- Data tables with search, filters, and pagination
- Form validation
- DTO-based REST APIs
- Global exception handling
- Audit logging
- Flyway database schema
- Docker support

## Roadmap

See [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md).
