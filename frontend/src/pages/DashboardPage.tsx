import { useEffect, useState } from "react";
import { Building2, CalendarClock, CheckCircle2, Users } from "lucide-react";
import { dashboardApi, employeeApi } from "../api/payroll";
import { useAuth } from "../auth/AuthContext";
import { HierarchyChart } from "../components/employee/HierarchyChart";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { formatDate } from "../lib/format";
import type { DashboardSummary, EmployeeHierarchy } from "../types";

const cards = [
  { label: "Total employees", key: "totalEmployees", icon: Users, tone: "bg-moss text-white" },
  { label: "Active employees", key: "activeEmployees", icon: CheckCircle2, tone: "bg-emerald-600 text-white" },
  { label: "Departments", key: "activeDepartments", icon: Building2, tone: "bg-lagoon text-white" },
  { label: "Pending leaves", key: "pendingLeaves", icon: CalendarClock, tone: "bg-ember text-ink" },
] as const;

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [hierarchy, setHierarchy] = useState<EmployeeHierarchy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .summary()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user?.employeeCode) {
      setHierarchy(null);
      return;
    }

    employeeApi.hierarchy().then(setHierarchy).catch(() => setHierarchy(null));
  }, [user?.employeeCode]);

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
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Workforce Snapshot</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Operational rhythm</h2>
            </div>
            <Badge value={`${summary?.approvedLeavesThisMonth ?? 0} approved`} />
          </div>
          <div className="mt-6">
            {hierarchy ? (
              <HierarchyChart hierarchy={hierarchy} />
            ) : (
              <p className="rounded-3xl bg-white/70 p-4 text-sm text-ink/55">Hierarchy chart is not available for this login.</p>
            )}
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Recent Leave Flow</p>
            <h2 className="mt-2 font-display text-2xl font-extrabold text-ink">Latest requests</h2>
          </div>

          <div className="mt-6 space-y-3">
            {(summary?.recentLeaves ?? []).map((leave) => (
              <div key={leave.id} className="rounded-3xl border border-moss/10 bg-white/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{leave.employeeName}</p>
                    <p className="text-sm text-ink/55">
                      {formatDate(leave.startDate)} to {formatDate(leave.endDate)} - {leave.days} day(s)
                    </p>
                  </div>
                  <Badge value={leave.status} />
                </div>
              </div>
            ))}
            {!loading && (summary?.recentLeaves ?? []).length === 0 && (
              <p className="rounded-3xl bg-white/70 p-4 text-sm text-ink/55">No leave requests yet.</p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
