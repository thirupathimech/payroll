import { useEffect, useState } from "react";
import { BarChart3, Building2, CalendarClock, CheckCircle2, ClipboardCheck, UserCheck, Users } from "lucide-react";
import { attendanceApi, dashboardApi, employeeApi } from "../api/payroll";
import { Card } from "../components/ui/Card";
import type { AttendanceRecord, DashboardSummary, Employee } from "../types";

const cards = [
  { label: "Total employees", key: "totalEmployees", icon: Users, tone: "bg-moss text-white" },
  { label: "Active employees", key: "activeEmployees", icon: CheckCircle2, tone: "bg-emerald-600 text-white" },
  { label: "Present today", key: "presentEmployees", icon: UserCheck, tone: "bg-lagoon text-white" },
  { label: "Departments", key: "activeDepartments", icon: Building2, tone: "bg-lagoon text-white" },
  { label: "Pending leaves", key: "pendingLeaves", icon: CalendarClock, tone: "bg-ember text-ink" },
] as const;

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .summary()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const date = new Date();
    const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    Promise.all([
      employeeApi.search({ page: 0, size: 1000 }),
      attendanceApi.list(today, today),
    ]).then(([employeePage, attendance]) => {
      setEmployees(employeePage.content);
      setTodayAttendance(attendance);
    }).catch(() => undefined);
  }, []);

  const presentIds = new Set(todayAttendance.filter((record) => record.clockIn).map((record) => record.employeeId));
  const departmentStats = Array.from(employees.filter((employee) => employee.status === "ACTIVE").reduce((groups, employee) => {
    const key = employee.departmentName || "Unassigned";
    const current = groups.get(key) ?? { name: key, total: 0, present: 0 };
    current.total += 1;
    if (presentIds.has(employee.id)) current.present += 1;
    groups.set(key, current);
    return groups;
  }, new Map<string, { name: string; total: number; present: number }>()).values()).sort((left, right) => right.total - left.total);
  const statusStats = Array.from(employees.reduce((groups, employee) => groups.set(employee.status, (groups.get(employee.status) ?? 0) + 1), new Map<string, number>()).entries()).sort((left, right) => right[1] - left[1]);
  const maxDepartment = Math.max(...departmentStats.map((item) => item.total), 1);
  const maxStatus = Math.max(...statusStats.map((item) => item[1]), 1);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const value = summary?.[card.key] ?? 0;
          return (
            <Card key={card.key} className="animate-rise" style={{ animationDelay: `${index * 80}ms` }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-ink/55">{card.label}</p>
                  <p className="mt-2 font-display text-4xl font-extrabold text-ink">{loading ? "-" : value}</p>
                </div>
                <div className={`grid h-14 w-14 place-items-center rounded-2xl ${card.tone}`}>
                  <Icon size={24} />
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Team distribution</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Department attendance</h2>
              <p className="mt-2 text-sm text-ink/60">Active workforce and today’s presence by department.</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-moss text-white"><BarChart3 size={22} /></div>
          </div>
          <div className="mt-7 space-y-5">{departmentStats.map((item) => <div key={item.name}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-bold text-ink">{item.name}</span><span className="font-semibold text-ink/55">{item.present}/{item.total} present</span></div><div className="h-3 overflow-hidden rounded-full bg-moss/10"><div className="h-full rounded-full bg-fern transition-all" style={{ width: `${(item.total / maxDepartment) * 100}%` }} /><div className="relative -mt-3 h-3 rounded-full bg-ember/80 transition-all" style={{ width: `${(item.present / maxDepartment) * 100}%` }} /></div></div>)}{!loading && departmentStats.length === 0 && <p className="rounded-2xl bg-moss/5 p-4 text-sm font-semibold text-ink/55">No department data available.</p>}</div>
          <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-ink/55"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-fern" />Team size</span><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-ember" />Present today</span></div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Workforce mix</p><h2 className="mt-2 font-display text-2xl font-extrabold text-ink">Employment status</h2><p className="mt-2 text-sm text-ink/60">A live composition of the role-scoped workforce.</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-lagoon text-white"><ClipboardCheck size={22} /></div></div>
          <div className="mt-7 space-y-4">{statusStats.map(([status, count]) => <div key={status}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-bold text-ink">{status.replace("_", " ")}</span><span className="font-extrabold text-ink">{count}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-moss/10"><div className="h-full rounded-full bg-lagoon transition-all" style={{ width: `${(count / maxStatus) * 100}%` }} /></div></div>)}{!loading && statusStats.length === 0 && <p className="rounded-2xl bg-moss/5 p-4 text-sm font-semibold text-ink/55">No employee status data available.</p>}</div>
        </Card>
      </section>
    </div>
  );
}
