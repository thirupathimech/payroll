import { clsx } from "clsx";
import {
  BadgeDollarSign,
  WalletCards,
  Building2,
  CalendarDays,
  CalendarOff,
  CalendarHeart,
  Clock3,
  ClipboardList,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
  Fingerprint,
  FileText,
  Laptop,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ADMIN_ROLES, HR_ROLES, MANAGER_ROLES, hasRoleAccess } from "../../lib/access";
import type { RoleName } from "../../types";

const navItems: Array<{ label: string; path: string; icon: typeof LayoutDashboard; allowedRoles?: RoleName[] }> = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Employees", path: "/employees", icon: Users },
  { label: "Employee Transfers", path: "/employee-transfers", icon: GitBranch, allowedRoles: MANAGER_ROLES },
  { label: "Resignations", path: "/resignations", icon: UserRound, allowedRoles: MANAGER_ROLES },
  { label: "Reimbursements", path: "/reimbursements", icon: WalletCards, allowedRoles: MANAGER_ROLES },
  { label: "Asset Releases", path: "/asset-releases", icon: Laptop, allowedRoles: HR_ROLES },
  { label: "Salary", path: "/salary", icon: WalletCards, allowedRoles: HR_ROLES },
  { label: "Payroll", path: "/payroll", icon: BadgeDollarSign, allowedRoles: HR_ROLES },
  { label: "Organization Chart", path: "/organization-hierarchy", icon: GitBranch, allowedRoles: ADMIN_ROLES },
  { label: "Users", path: "/users", icon: UserCog, allowedRoles: ADMIN_ROLES },
  { label: "Branches", path: "/branches", icon: GitBranch, allowedRoles: HR_ROLES },
  { label: "Departments", path: "/departments", icon: Building2, allowedRoles: HR_ROLES },
  { label: "Designations", path: "/designations", icon: ClipboardList, allowedRoles: HR_ROLES },
  { label: "Shift Management", path: "/shifts", icon: Clock3, allowedRoles: HR_ROLES },
  { label: "Shift Assignment", path: "/shift-assignments", icon: CalendarDays, allowedRoles: MANAGER_ROLES },
  { label: "Week Off Assignment", path: "/week-off-assignments", icon: CalendarOff, allowedRoles: MANAGER_ROLES },
  { label: "Holiday Configuration", path: "/holidays", icon: CalendarHeart, allowedRoles: MANAGER_ROLES },
  { label: "Leaves", path: "/leaves", icon: CalendarDays, allowedRoles: MANAGER_ROLES },
  { label: "Missing Punch Requests", path: "/missing-punch-requests", icon: Fingerprint, allowedRoles: MANAGER_ROLES },
  { label: "Attendance", path: "/attendance", icon: Fingerprint, allowedRoles: MANAGER_ROLES },
  { label: "Employee Attendance", path: "/attendance/report", icon: ClipboardList, allowedRoles: MANAGER_ROLES },
  { label: "Reports", path: "/reports", icon: FileText, allowedRoles: MANAGER_ROLES },
  { label: "Settings", path: "/settings", icon: Settings, allowedRoles: ADMIN_ROLES },
  { label: "System Configuration", path: "/system-configuration", icon: Settings, allowedRoles: ADMIN_ROLES },
  { label: "Audit Logs", path: "/audit-logs", icon: ShieldCheck, allowedRoles: ADMIN_ROLES },
];

const personnelItems: Array<{ label: string; path: string; icon: typeof LayoutDashboard }> = [
  { label: "My Profile", path: "/employees", icon: UserRound },
  { label: "Apply Leave", path: "/leaves", icon: CalendarDays },
  { label: "Missing Punch", path: "/missing-punch-requests", icon: Fingerprint },
  { label: "Transfer Request", path: "/employee-transfers", icon: GitBranch },
  { label: "Resignation", path: "/resignations", icon: UserRound },
  { label: "Reimbursements", path: "/reimbursements", icon: WalletCards },
  { label: "My Shift", path: "/shift-assignments", icon: Clock3 },
  { label: "My Holidays & Week Off", path: "/my-calendar-off", icon: CalendarOff },
  { label: "My Payslips", path: "/my-payslips", icon: WalletCards },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, viewMode, logout } = useAuth();
  const visibleItems =
    viewMode === "personnel" ? personnelItems : navItems.filter((item) => hasRoleAccess(user, item.allowedRoles));

  return (
    <>
      {/* Mobile/tablet scrim */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-[2px] animate-fadeIn lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[17rem] shrink-0 flex-col overflow-hidden bg-ink px-5 py-6 text-white transition-transform duration-300 ease-out",
          "lg:sticky lg:top-0 lg:z-30 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-8 flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-ember text-ink shadow-glow">
              <BadgeDollarSign size={22} />
            </div>
            <div>
              <p className="font-display text-lg font-extrabold leading-tight">Payroll</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                {user?.orgCode ?? "ORG"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 shrink-0 rounded-lg bg-white/[0.06] px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Viewing as</p>
          <p className="text-sm font-bold text-white/85">{viewMode === "personnel" ? "Personnel" : "Management"}</p>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
                    isActive
                      ? "bg-white text-ink shadow-raised"
                      : "text-white/65 hover:bg-white/10 hover:text-white",
                  )
                }
              >
                <Icon size={17} strokeWidth={2.25} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-4 shrink-0 space-y-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white/65 transition hover:bg-red-500/15 hover:text-red-300 sm:hidden"
          >
            <LogOut size={17} strokeWidth={2.25} />
            Logout
          </button>
          <p className="text-[11px] font-medium text-white/35">Payroll HRMS</p>
        </div>
      </aside>
    </>
  );
}
