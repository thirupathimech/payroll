import { clsx } from "clsx";
import {
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CalendarOff,
  CalendarHeart,
  Clock3,
  ClipboardList,
  GitBranch,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
  Fingerprint,
  FileText,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ADMIN_ROLES, HR_ROLES, MANAGER_ROLES, hasRoleAccess } from "../../lib/access";
import type { RoleName } from "../../types";

const navItems: Array<{ label: string; path: string; icon: typeof LayoutDashboard; allowedRoles?: RoleName[] }> = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Employees", path: "/employees", icon: Users },
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
  { label: "Attendance", path: "/attendance", icon: Fingerprint, allowedRoles: MANAGER_ROLES },
  { label: "Employee Attendance", path: "/attendance/report", icon: ClipboardList, allowedRoles: MANAGER_ROLES },
  { label: "Reports", path: "/reports", icon: FileText, allowedRoles: MANAGER_ROLES },
  { label: "Settings", path: "/settings", icon: Settings, allowedRoles: ADMIN_ROLES },
  { label: "System Configuration", path: "/system-configuration", icon: Settings, allowedRoles: MANAGER_ROLES },
  { label: "Audit Logs", path: "/audit-logs", icon: ShieldCheck, allowedRoles: ADMIN_ROLES },
];

const personnelItems: Array<{ label: string; path: string; icon: typeof LayoutDashboard }> = [
  { label: "My Profile", path: "/employees", icon: UserRound },
  { label: "Apply Leave", path: "/leaves", icon: CalendarDays },
  { label: "My Shift", path: "/shift-assignments", icon: Clock3 },
];

export function Sidebar() {
  const { user, viewMode } = useAuth();
  const visibleItems =
    viewMode === "personnel" ? personnelItems : navItems.filter((item) => hasRoleAccess(user, item.allowedRoles));

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-white/60 bg-ink px-5 py-6 text-white lg:block">
      <div className="mb-10 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ember text-ink shadow-glow">
          <BadgeDollarSign size={24} />
        </div>
        <div>
          <p className="font-display text-xl font-extrabold">Payroll</p>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">{user?.orgCode ?? "ORG"}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
            {viewMode === "personnel" ? "Personnel" : "Management"}
          </p>
        </div>
      </div>

      <nav className="space-y-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition",
                  isActive
                    ? "bg-white text-ink shadow-glow"
                    : "text-white/68 hover:bg-white/10 hover:text-white",
                )
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

    </aside>
  );
}
