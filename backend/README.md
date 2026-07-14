# Payroll Backend

Spring Boot 3 backend for the Payroll Management System.

## Tech Stack

- Java 17
- Spring Boot 3
- Spring Security with JWT
- Spring Data JPA + Hibernate
- MySQL
- Flyway migrations
- DTO pattern
- Global exception handling
- Audit logging
- Swagger/OpenAPI

## Folder Structure

```text
backend/
├── src/main/java/com/payroll/backend/
│   ├── controller/      # REST endpoints
│   ├── service/         # Business logic
│   ├── repository/      # Spring Data repositories
│   ├── domain/          # JPA entities and enums
│   ├── dto/             # Request/response DTOs
│   ├── security/        # JWT and Spring Security
│   ├── exception/       # Global error handling
│   └── config/          # Security and app config
└── src/main/resources/
    ├── application.yml
    └── db/migration/    # Flyway schema
```

## Local Run

Prerequisites:

- Java 17
- Maven 3.9+
- MySQL 8+

Create database/user if needed:

```sql
CREATE DATABASE payroll;
CREATE USER 'payroll'@'%' IDENTIFIED BY 'payroll';
GRANT ALL PRIVILEGES ON payroll.* TO 'payroll'@'%';
FLUSH PRIVILEGES;
```

Run from `backend/`:

```powershell
mvn spring-boot:run
```

Backend starts at:

```text
http://localhost:8080
```

Swagger:

```text
http://localhost:8080/swagger-ui.html
```

Create the first admin from `POST /api/v1/auth/register` or the frontend Register option. The response includes a generated three-letter `orgCode` required by `POST /api/v1/auth/login`.

## Environment Variables

Copy `.env.example` values into your shell or deployment environment.

PowerShell example:

```powershell
$env:DB_URL="jdbc:mysql://localhost:3306/payroll?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:DB_USERNAME="payroll"
$env:DB_PASSWORD="payroll"
$env:JWT_SECRET="change-this-to-a-long-strong-production-secret-at-least-32-characters"
$env:HIBERNATE_DDL_AUTO="update"
mvn spring-boot:run
```

## API Endpoints

Authentication:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

Dashboard:

- `GET /api/v1/dashboard/summary`

Employees:

- `GET /api/v1/employees`
- `GET /api/v1/employees/{id}`
- `POST /api/v1/employees`
- `PUT /api/v1/employees/{id}`
- `DELETE /api/v1/employees/{id}`

Departments:

- `GET /api/v1/departments`
- `GET /api/v1/departments/active`
- `GET /api/v1/departments/{id}`
- `POST /api/v1/departments`
- `PUT /api/v1/departments/{id}`
- `DELETE /api/v1/departments/{id}`

Designations:

- `GET /api/v1/designations`
- `GET /api/v1/designations/{id}`
- `POST /api/v1/designations`
- `PUT /api/v1/designations/{id}`
- `DELETE /api/v1/designations/{id}`

Leaves:

- `GET /api/v1/leaves`
- `GET /api/v1/leaves/{id}`
- `POST /api/v1/leaves`
- `PATCH /api/v1/leaves/{id}/decision`

Settings:

- `GET /api/v1/settings/company`
- `PUT /api/v1/settings/company`

Audit:

- `GET /api/v1/audit-logs`

## Database Schema

Flyway migration:

```text
src/main/resources/db/migration/V1__init_payroll_schema.sql
```

Tables:

- `app_users`
- `departments`
- `designations`
- `employees`
- `leave_requests`
- `company_settings`
- `audit_logs`
- `employee_documents`

Organization-owned tables include `org_code` and authenticated API reads/writes are scoped to the logged-in org.

By default, Hibernate runs with `ddl-auto=update`, so missing tables and new entity columns are created automatically when the app starts. Column/table drops should still be handled with Flyway migrations to avoid accidental data loss.

## Docker Run

From repository root:

```powershell
docker compose up --build backend mysql
```

Or run the full application:

```powershell
docker compose up --build
```