import { useState } from "react";
import { BriefcaseBusiness, LogOut, Menu, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ADMIN_ROLES, HR_ROLES, MANAGER_ROLES, hasRoleAccess } from "../../lib/access";
import { initials } from "../../lib/format";
import { Button } from "../ui/Button";

const mobileItems = [
  { label: "Dashboard", path: "/" },
  { label: "Employees", path: "/employees" },
  { label: "Branches", path: "/branches", allowedRoles: HR_ROLES },
  { label: "Departments", path: "/departments", allowedRoles: HR_ROLES },
  { label: "Designations", path: "/designations", allowedRoles: HR_ROLES },
  { label: "Shifts", path: "/shifts", allowedRoles: HR_ROLES },
  { label: "Assignments", path: "/shift-assignments", allowedRoles: MANAGER_ROLES },
  { label: "Leaves", path: "/leaves", allowedRoles: MANAGER_ROLES },
  { label: "Settings", path: "/settings", allowedRoles: ADMIN_ROLES },
  { label: "Users", path: "/users", allowedRoles: ADMIN_ROLES },
  { label: "Audit Logs", path: "/audit-logs", allowedRoles: ADMIN_ROLES },
];

const personnelMobileItems = [
  { label: "My Profile", path: "/employees" },
  { label: "Apply Leave", path: "/leaves" },
  { label: "My Shift", path: "/shift-assignments" },
];

export function Topbar() {
  const { user, logout, viewMode, setViewMode, canSwitchViewMode } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleMobileItems =
    viewMode === "personnel" ? personnelMobileItems : mobileItems.filter((item) => hasRoleAccess(user, item.allowedRoles));

  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-shell/80 px-4 py-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          
        </div>

        <div className="flex items-center gap-3">
          {canSwitchViewMode && (
            <div className="hidden rounded-2xl border border-moss/15 bg-white/70 p-1 sm:flex">
              <Button
                type="button"
                variant={viewMode === "personnel" ? "primary" : "ghost"}
                className="px-3 py-2"
                onClick={() => setViewMode("personnel")}
              >
                <UserRound size={15} />
                Personnel
              </Button>
              <Button
                type="button"
                variant={viewMode === "management" ? "primary" : "ghost"}
                className="px-3 py-2"
                onClick={() => setViewMode("management")}
              >
                <BriefcaseBusiness size={15} />
                Management
              </Button>
            </div>
          )}
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-ink">{user?.fullName}</p>
            <p className="text-xs font-semibold text-ink/50">
              {user?.role} · {viewMode === "personnel" ? "Personnel" : "Management"}
            </p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-moss text-sm font-extrabold text-white">
            {initials(user?.fullName ?? "User")}
          </div>
          <Button type="button" variant="secondary" className="hidden sm:inline-flex" onClick={logout}>
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </div>

      <details open={mobileMenuOpen} onToggle={(event) => setMobileMenuOpen(event.currentTarget.open)} className="mt-4 rounded-2xl bg-white/70 p-3 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-moss">
          <Menu size={18} />
          Menu
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {canSwitchViewMode && (
            <div className="grid grid-cols-2 gap-2 sm:col-span-3">
              <button
                type="button"
                className={`rounded-xl px-3 py-2 text-left text-sm font-bold ${
                  viewMode === "personnel" ? "bg-moss text-white" : "bg-white text-moss"
                }`}
                onClick={() => setViewMode("personnel")}
              >
                Personnel
              </button>
              <button
                type="button"
                className={`rounded-xl px-3 py-2 text-left text-sm font-bold ${
                  viewMode === "management" ? "bg-moss text-white" : "bg-white text-moss"
                }`}
                onClick={() => setViewMode("management")}
              >
                Management
              </button>
            </div>
          )}
          {visibleMobileItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-bold ${isActive ? "bg-moss text-white" : "bg-white text-moss"}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          <button className="rounded-xl bg-red-50 px-3 py-2 text-left text-sm font-bold text-red-700" onClick={() => { setMobileMenuOpen(false); logout(); }}>
            Logout
          </button>
        </div>
      </details>
    </header>
  );
}
