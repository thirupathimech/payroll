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

Default login:

- Email: `admin@payroll.local`
- Password: `Admin@123`

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
- Employee management
- Department management
- Designation management
- Leave management with approval flow
- Company settings
- Dashboard cards
- Data tables with search, filters, and pagination
- Form validation
- DTO-based REST APIs
- Global exception handling
- Audit logging
- Flyway database schema
- Docker support

## Roadmap

See [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md).
