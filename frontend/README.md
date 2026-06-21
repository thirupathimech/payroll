# Payroll Frontend

React frontend for the Payroll Management System.

## Tech Stack

- React 18
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Axios
- Modern responsive SaaS UI

## Folder Structure

```text
frontend/
├── src/
│   ├── api/             # Axios client and API functions
│   ├── auth/            # Auth context and session handling
│   ├── components/      # Layout and reusable UI components
│   ├── hooks/           # Shared hooks
│   ├── lib/             # Config and formatting helpers
│   ├── pages/           # Feature pages
│   └── types/           # Shared TypeScript types
├── Dockerfile
├── nginx.conf
└── vite.config.ts
```

## Local Run

Prerequisites:

- Node.js 20+
- Backend running at `http://localhost:8080`

Install dependencies:

```powershell
cd frontend
npm install
```

Create local env file:

```powershell
Copy-Item .env.example .env
```

Run frontend:

```powershell
npm run dev
```

Open:

```text
http://localhost:5173
```

Default login:

```text
Email: admin@payroll.local
Password: Admin@123
```

## Available Scripts

```powershell
npm run dev
npm run build
npm run preview
npm run lint
```

## Environment Variables

`.env.example`:

```text
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

If you run through Docker Compose, the frontend image uses:

```text
VITE_API_BASE_URL=/api/v1
```

The Nginx container proxies `/api` to the backend service.

## Pages

- Login
- Dashboard
- Employees
- Departments
- Designations
- Leave Management
- Company Settings
- Audit Logs

## Simple Tanglish Run Steps

Frontend mattum run panna:

```powershell
cd frontend
npm install
npm run dev
```

Browser la open panna:

```text
http://localhost:5173
```

Backend already `http://localhost:8080` la run aaganum.
