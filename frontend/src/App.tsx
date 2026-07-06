import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { DesignationsPage } from "./pages/DesignationsPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { LeavePage } from "./pages/LeavePage";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ShiftAssignmentPage } from "./pages/ShiftAssignmentPage";
import { ShiftManagementPage } from "./pages/ShiftManagementPage";
import { UsersPage } from "./pages/UsersPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/designations" element={<DesignationsPage />} />
          <Route path="/shifts" element={<ShiftManagementPage />} />
          <Route path="/shift-assignments" element={<ShiftAssignmentPage />} />
          <Route path="/leaves" element={<LeavePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
