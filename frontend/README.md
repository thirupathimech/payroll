# Payroll Frontend

React web application for managing payroll and HR operations.

## Stack

- React 18, TypeScript, and Vite
- Tailwind CSS
- React Router
- Axios
- Lucide icons

## Features

- Organization registration and authenticated workspace access
- Employee profiles, hierarchy, branches, departments, designations, and users
- Shifts, attendance, leave, holidays, and week-off management
- Salary components, employee compensation, reports, settings, and audit logs
- Role-based access for administrators, HR, managers, leads, and employees

## Requirements

- Node.js (the Docker build uses Node 20)
- Payroll backend running at `http://localhost:8080`

## Run locally

From this directory:

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The backend setup is documented in [../backend/README.md](../backend/README.md).

## Configuration

The application reads its API base URL from `VITE_API_BASE_URL`.

```text
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

This is the value in `.env.example` and the default when the variable is not set. Use `/api/v1` when the app is served behind the included Nginx reverse proxy.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server on port 5173. |
| `npm run lint` | Run ESLint. |
| `npm run build` | Type-check and create a production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |

## Project structure

```text
src/
├── api/          API client and endpoint modules
├── auth/         Session and access-state handling
├── components/   Shared UI, layout, and employee components
├── hooks/        Shared React hooks
├── lib/          Configuration, formatting, and access helpers
├── pages/        Route-level screens
└── types/        Shared TypeScript models
```

## Docker

To run the complete application stack from the repository root:

```powershell
docker compose up --build
```

The frontend is available at [http://localhost:5173](http://localhost:5173). The container serves the built app through Nginx and proxies `/api` requests to the backend.
