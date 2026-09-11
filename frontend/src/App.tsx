import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { BranchesPage } from "./pages/BranchesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { DesignationsPage } from "./pages/DesignationsPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { OrganizationHierarchyPage } from "./pages/OrganizationHierarchyPage";
import { LeavePage } from "./pages/LeavePage";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SystemConfigurationPage } from "./pages/SystemConfigurationPage";
import { ShiftAssignmentPage } from "./pages/ShiftAssignmentPage";
import { ShiftManagementPage } from "./pages/ShiftManagementPage";
import { UsersPage } from "./pages/UsersPage";
import { WeekOffAssignmentPage } from "./pages/WeekOffAssignmentPage";
import { HolidayConfigurationPage } from "./pages/HolidayConfigurationPage";
import { AttendancePage } from "./pages/AttendancePage";
import { AttendanceReportPage } from "./pages/AttendanceReportPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SalaryPage } from "./pages/SalaryPage";
import { MyCalendarOffPage } from "./pages/MyCalendarOffPage";
import { MissingPunchPage } from "./pages/MissingPunchPage";
import { PayrollPage } from "./pages/PayrollPage";
import { MyPayslipsPage } from "./pages/MyPayslipsPage";
import { EmployeeTransferPage } from "./pages/EmployeeTransferPage";
import { ResignationPage } from "./pages/ResignationPage";
import { ReimbursementPage } from "./pages/ReimbursementPage";
import { OvertimePage } from "./pages/OvertimePage";
import { OvertimePolicyPage } from "./pages/OvertimePolicyPage";
import { ExitClearancePage } from "./pages/ExitClearancePage";
import { ADMIN_ROLES, HR_ROLES, MANAGER_ROLES } from "./lib/access";

function HomeRoute() {
  const { viewMode } = useAuth();
  return viewMode === "personnel" ? <Navigate to="/employees" replace /> : <DashboardPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<HomeRoute />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route element={<ProtectedRoute allowedRoles={HR_ROLES} />}>
            <Route path="/salary" element={<SalaryPage />} />
            <Route path="/payroll" element={<PayrollPage />} />
          </Route>
          <Route path="/shift-assignments" element={<ShiftAssignmentPage />} />
          <Route path="/my-calendar-off" element={<MyCalendarOffPage />} />
          <Route path="/my-payslips" element={<MyPayslipsPage />} />
          <Route path="/leaves" element={<LeavePage />} />
          <Route path="/missing-punch-requests" element={<MissingPunchPage />} />
          <Route path="/employee-transfers" element={<EmployeeTransferPage />} />
          <Route path="/resignations" element={<ResignationPage />} />
          <Route path="/reimbursements" element={<ReimbursementPage />} />
          <Route path="/overtime-requests" element={<OvertimePage />} />
          <Route element={<ProtectedRoute allowedRoles={HR_ROLES} />}>
            <Route path="/asset-releases" element={<ExitClearancePage />} />
          </Route>
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/attendance/report" element={<AttendanceReportPage />} />
          <Route element={<ProtectedRoute allowedRoles={MANAGER_ROLES} />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} />}>
            <Route path="/system-configuration" element={<SystemConfigurationPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/organization-hierarchy" element={<OrganizationHierarchyPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={HR_ROLES} />}>
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/designations" element={<DesignationsPage />} />
            <Route path="/shifts" element={<ShiftManagementPage />} />
            <Route path="/overtime-policies" element={<OvertimePolicyPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={MANAGER_ROLES} />}>
            <Route path="/week-off-assignments" element={<WeekOffAssignmentPage />} />
            <Route path="/holidays" element={<HolidayConfigurationPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
