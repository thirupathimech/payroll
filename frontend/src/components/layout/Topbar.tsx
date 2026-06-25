import { LogOut, Menu } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { initials } from "../../lib/format";
import { Button } from "../ui/Button";

const mobileItems = [
  { label: "Dashboard", path: "/" },
  { label: "Employees", path: "/employees" },
  { label: "Departments", path: "/departments" },
  { label: "Shifts", path: "/shifts" },
  { label: "Assignments", path: "/shift-assignments" },
  { label: "Leaves", path: "/leaves" },
  { label: "Settings", path: "/settings" },
];

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-shell/80 px-4 py-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-fern/70">Enterprise Payroll</p>
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">People, pay, and policy in sync</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-ink">{user?.fullName}</p>
            <p className="text-xs font-semibold text-ink/50">{user?.role}</p>
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

      <details className="mt-4 rounded-2xl bg-white/70 p-3 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-moss">
          <Menu size={18} />
          Menu
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {mobileItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-bold ${isActive ? "bg-moss text-white" : "bg-white text-moss"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link to="/designations" className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-moss">
            Designations
          </Link>
          {user?.role === "ADMIN" && (
            <Link to="/audit-logs" className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-moss">
              Audit Logs
            </Link>
          )}
          <button className="rounded-xl bg-red-50 px-3 py-2 text-left text-sm font-bold text-red-700" onClick={logout}>
            Logout
          </button>
        </div>
      </details>
    </header>
  );
}
