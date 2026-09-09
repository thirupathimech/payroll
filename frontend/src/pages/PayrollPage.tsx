import { useCallback, useEffect, useState } from "react";
import { Calculator, CheckCircle2, Eye, FileLock2, PlayCircle, RefreshCw, Trash2, WalletCards } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { payrollRunApi, settingsApi } from "../api/payroll";
import { useAuth } from "../auth/AuthContext";
import { PayslipDetails } from "../components/payroll/PayslipDetails";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { formatCurrency } from "../lib/format";
import type { CompanySettings, PayrollEntry, PayrollRun } from "../types";

const today = new Date().toISOString().slice(0, 10);

function periodLabel(run: Pick<PayrollRun, "periodStart" | "periodEnd">) {
  const format = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${format.format(new Date(`${run.periodStart}T00:00:00`))} – ${format.format(new Date(`${run.periodEnd}T00:00:00`))}`;
}

function dateLabel(value?: string) {
  return value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)) : "-";
}

function frequencyLabel(value?: PayrollRun["payrollFrequency"]) {
  return value === "BIWEEKLY" ? "Biweekly" : value === "WEEKLY" ? "Weekly" : "Monthly";
}

function localDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function addDays(value: Date, days: number) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days, 12);
}

function monthDay(year: number, month: number, day: number) {
  return new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()), 12);
}

function previewPeriod(anchorDate: string, settings: CompanySettings) {
  const anchor = localDate(anchorDate);
  if (settings.payrollFrequency === "MONTHLY") {
    let end = monthDay(anchor.getFullYear(), anchor.getMonth(), settings.payrollCutoffDay);
    if (anchor > end) end = monthDay(anchor.getFullYear(), anchor.getMonth() + 1, settings.payrollCutoffDay);
    const start = addDays(monthDay(end.getFullYear(), end.getMonth() - 1, settings.payrollCutoffDay), 1);
    return { start, end };
  }

  const weekStart = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].indexOf(settings.weekStartDay);
  const startOfWeek = addDays(anchor, -((anchor.getDay() - weekStart + 7) % 7));
  if (settings.payrollFrequency === "WEEKLY") return { start: startOfWeek, end: addDays(startOfWeek, 6) };

  const cycleBase = new Date(1970, 0, 5, 12);
  const cycleAnchor = addDays(cycleBase, (weekStart - cycleBase.getDay() + 7) % 7);
  const difference = Math.floor((Date.UTC(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate()) - Date.UTC(cycleAnchor.getFullYear(), cycleAnchor.getMonth(), cycleAnchor.getDate())) / 86_400_000);
  const start = addDays(cycleAnchor, Math.floor(difference / 14) * 14);
  return { start, end: addDays(start, 13) };
}

export function PayrollPage() {
  const { currency } = useAuth();
  const [anchorDate, setAnchorDate] = useState(today);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [payrollSettings, setPayrollSettings] = useState<CompanySettings | null>(null);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const periodPreview = payrollSettings && anchorDate ? previewPeriod(anchorDate, payrollSettings) : null;

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      setRuns(await payrollRunApi.runs());
    } catch (exception) {
      setError(getErrorMessage(exception));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRuns(); }, [loadRuns]);
  useEffect(() => {
    void settingsApi.get().then(setPayrollSettings).catch((exception) => setError(getErrorMessage(exception)));
  }, []);

  async function openRun(id: number) {
    setError("");
    try {
      setSelectedRun(await payrollRunApi.run(id));
    } catch (exception) {
      setError(getErrorMessage(exception));
    }
  }

  async function createRun() {
    if (!anchorDate) return;
    const [year, monthNumber] = anchorDate.split("-").map(Number);
    setWorking(true); setError("");
    try {
      const run = await payrollRunApi.create({ year, month: monthNumber, anchorDate });
      setSelectedRun(run);
      await loadRuns();
    } catch (exception) {
      setError(getErrorMessage(exception));
    } finally { setWorking(false); }
  }

  async function action(action: "recalculate" | "approve" | "lock") {
    if (!selectedRun) return;
    setWorking(true); setError("");
    try {
      const run = await payrollRunApi[action](selectedRun.id);
      setSelectedRun(run);
      await loadRuns();
    } catch (exception) {
      setError(getErrorMessage(exception));
    } finally { setWorking(false); }
  }

  async function deleteRun() {
    if (!selectedRun || !window.confirm(`Delete the draft payroll for ${periodLabel(selectedRun)}?`)) return;
    setWorking(true); setError("");
    try {
      await payrollRunApi.deleteDraft(selectedRun.id);
      setSelectedRun(null);
      await loadRuns();
    } catch (exception) {
      setError(getErrorMessage(exception));
    } finally { setWorking(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Payroll processing</p><h1 className="mt-1 font-display text-3xl font-extrabold text-ink">{frequencyLabel(payrollSettings?.payrollFrequency)} Payroll</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">Generate a reviewable salary snapshot, approve it, then lock it before payment. Locked payslips remain unchanged even when employee salary data is updated later.</p></div>
        <Card className="flex w-full flex-col gap-3 p-4 sm:flex-row sm:items-end lg:w-auto"><div><Input label="Date in payroll period" type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} /><p className="mt-1 text-xs text-ink/50">{payrollSettings ? `${frequencyLabel(payrollSettings.payrollFrequency)} schedule${payrollSettings.payrollFrequency === "MONTHLY" ? ` · cutoff day ${payrollSettings.payrollCutoffDay}` : ""} · salary credit day ${payrollSettings.payrollDisbursementDay}` : "Loading payroll defaults..."}</p>{periodPreview && <p className="mt-1 text-xs font-semibold text-fern">Period: {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(periodPreview.start)} – {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(periodPreview.end)}</p>}</div><Button onClick={createRun} disabled={working || !anchorDate}><PlayCircle size={17} />{working ? "Generating..." : "Generate payroll"}</Button></Card>
      </div>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="font-display text-xl font-extrabold">Payroll runs</h2><p className="mt-1 text-sm text-ink/55">Open a run to review employees and their payslips.</p></div><Button variant="secondary" size="sm" onClick={() => void loadRuns()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />Refresh</Button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-moss/[0.04] text-xs uppercase tracking-wider text-ink/50"><tr><th className="px-5 py-3">Period</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Employees</th><th className="px-5 py-3 text-right">Gross</th><th className="px-5 py-3 text-right">Net pay</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-line">{!loading && runs.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-ink/55">No payroll runs yet. Generate a payroll period when attendance and leave approvals are ready.</td></tr>}{runs.map((run) => <tr key={run.id} className="hover:bg-moss/[0.025]"><td className="px-5 py-4"><p className="font-bold">{periodLabel(run)}</p><p className="mt-0.5 text-xs text-ink/50">{frequencyLabel(run.payrollFrequency)} · Credit {dateLabel(run.disbursementDate)}</p></td><td className="px-5 py-4"><Badge value={run.status} /></td><td className="px-5 py-4 text-right">{run.employeeCount}</td><td className="px-5 py-4 text-right">{formatCurrency(run.grossEarnings, currency)}</td><td className="px-5 py-4 text-right font-bold text-fern">{formatCurrency(run.netPay, currency)}</td><td className="px-5 py-4 text-right"><Button size="sm" variant="secondary" onClick={() => void openRun(run.id)}><Eye size={15} />Open</Button></td></tr>)}</tbody></table></div>
      </Card>

      {selectedRun && <section className="space-y-5"><Card><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-2xl font-extrabold">{periodLabel(selectedRun)}</h2><Badge value={selectedRun.status} /></div><p className="mt-2 text-sm text-ink/60">{frequencyLabel(selectedRun.payrollFrequency)} · Salary credit date {dateLabel(selectedRun.disbursementDate)} · {selectedRun.employeeCount} employee payslip(s) · Generated salary data is preserved as a snapshot.</p></div><div className="flex flex-wrap gap-2">{selectedRun.status === "DRAFT" && <><Button variant="secondary" onClick={() => void action("recalculate")} disabled={working}><Calculator size={16} />Recalculate</Button><Button onClick={() => void action("approve")} disabled={working}><CheckCircle2 size={16} />Approve</Button><Button variant="danger" onClick={() => void deleteRun()} disabled={working}><Trash2 size={16} />Delete draft</Button></>}{selectedRun.status === "APPROVED" && <Button onClick={() => void action("lock")} disabled={working}><FileLock2 size={16} />Lock payroll</Button>}{selectedRun.status === "LOCKED" && <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700"><FileLock2 size={16} />Locked {selectedRun.lockedBy ? `by ${selectedRun.lockedBy}` : ""}</span>}</div></div></Card>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Gross earnings" value={formatCurrency(selectedRun.grossEarnings, currency)} /><Summary label="Deductions" value={formatCurrency(selectedRun.totalDeductions, currency)} /><Summary label="Employer cost" value={formatCurrency(selectedRun.employerContributions, currency)} /><Summary label="Net payroll" value={formatCurrency(selectedRun.netPay, currency)} accent /></div>
        <Card className="overflow-hidden p-0"><div className="border-b border-line px-5 py-4"><h3 className="font-display text-xl font-extrabold">Employee payroll</h3><p className="mt-1 text-sm text-ink/55">Review attendance context, leave proration, and each generated payslip.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-moss/[0.04] text-xs uppercase tracking-wider text-ink/50"><tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3 text-right">Payable days</th><th className="px-5 py-3 text-right">Attendance</th><th className="px-5 py-3 text-right">Unpaid / LOP</th><th className="px-5 py-3 text-right">Gross</th><th className="px-5 py-3 text-right">Net pay</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-line">{selectedRun.entries.map((entry) => <tr key={entry.id} className="hover:bg-moss/[0.025]"><td className="px-5 py-4"><p className="font-bold">{entry.employeeName}</p><p className="mt-0.5 text-xs text-ink/50">{entry.employeeCode} · {entry.departmentName || "-"}</p></td><td className="px-5 py-4 text-right">{entry.payableDays} / {entry.periodDays}</td><td className="px-5 py-4 text-right">{entry.attendanceDays} / {entry.workingDays}</td><td className="px-5 py-4 text-right">{entry.unpaidLeaveDays}</td><td className="px-5 py-4 text-right">{formatCurrency(entry.grossEarnings, currency)}</td><td className="px-5 py-4 text-right font-bold text-fern">{formatCurrency(entry.netPay, currency)}</td><td className="px-5 py-4 text-right"><Button size="sm" variant="secondary" onClick={() => setSelectedEntry(entry)}><WalletCards size={15} />Payslip</Button></td></tr>)}</tbody></table></div></Card>
      </section>}
      <Modal open={Boolean(selectedEntry)} onClose={() => setSelectedEntry(null)} title="Payslip" description="Generated payroll snapshot"><>{selectedEntry && <PayslipDetails entry={selectedEntry} currency={currency} />}</></Modal>
    </div>
  );
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <Card className="p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">{label}</p><p className={`mt-2 text-xl font-extrabold ${accent ? "text-fern" : "text-ink"}`}>{value}</p></Card>;
}
