import { clsx } from "clsx";
import {
  BadgeDollarSign,
  Building2,
  CalendarDays,
  Clock3,
  ClipboardList,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Employees", path: "/employees", icon: Users },
  { label: "Departments", path: "/departments", icon: Building2 },
  { label: "Designations", path: "/designations", icon: ClipboardList },
  { label: "Shift Management", path: "/shifts", icon: Clock3 },
  { label: "Shift Assignment", path: "/shift-assignments", icon: CalendarDays },
  { label: "Leaves", path: "/leaves", icon: CalendarDays },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Audit Logs", path: "/audit-logs", icon: ShieldCheck, adminOnly: true },
];

export function Sidebar() {
  const { user } = useAuth();
  const visibleItems = navItems.filter((item) => !item.adminOnly || user?.role === "ADMIN");

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-white/60 bg-ink px-5 py-6 text-white lg:block">
      <div className="mb-10 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ember text-ink shadow-glow">
          <BadgeDollarSign size={24} />
        </div>
        <div>
          <p className="font-display text-xl font-extrabold">Payroll</p>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">{user?.orgCode ?? "ORG"}</p>
        </div>
      </div>

      <nav className="space-y-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
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

      <div className="mt-10 rounded-[1.6rem] border border-white/10 bg-white/8 p-4">
        <p className="font-display text-sm font-extrabold">Payroll health</p>
        <p className="mt-2 text-sm leading-6 text-white/58">
          Secure JWT auth, auditable changes, and layered APIs are ready for production hardening.
        </p>
      </div>
    </aside>
  );
}
