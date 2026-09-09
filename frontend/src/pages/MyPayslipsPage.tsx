import { useCallback, useEffect, useState } from "react";
import { Eye, ReceiptText, RefreshCw } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { payrollRunApi } from "../api/payroll";
import { useAuth } from "../auth/AuthContext";
import { PayslipDetails } from "../components/payroll/PayslipDetails";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { formatCurrency } from "../lib/format";
import type { PayrollEntry } from "../types";

function periodLabel(entry: PayrollEntry) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" })
    .format(new Date(entry.periodYear, entry.periodMonth - 1, 1));
}

export function MyPayslipsPage() {
  const { currency } = useAuth();
  const [payslips, setPayslips] = useState<PayrollEntry[]>([]);
  const [selected, setSelected] = useState<PayrollEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setPayslips(await payrollRunApi.myPayslips()); } catch (exception) { setError(getErrorMessage(exception)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Payroll history</p><h1 className="mt-1 font-display text-3xl font-extrabold text-ink">My Payslips</h1><p className="mt-2 text-sm leading-6 text-ink/60">Approved and locked monthly payslips will appear here.</p></div><Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</Button></div>{error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{!loading && payslips.length === 0 && <Card className="md:col-span-2 xl:col-span-3"><div className="py-10 text-center"><ReceiptText className="mx-auto text-ink/30" size={34} /><p className="mt-3 font-bold text-ink/70">No payslips available yet</p><p className="mt-1 text-sm text-ink/50">Your HR team will publish an approved payroll after monthly review.</p></div></Card>}{payslips.map((entry) => <Card key={entry.id}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-fern">{periodLabel(entry)}</p><h2 className="mt-2 font-display text-xl font-extrabold">{formatCurrency(entry.netPay, currency)}</h2><p className="mt-1 text-sm text-ink/55">Net pay · {entry.payableDays} payable day(s)</p></div><ReceiptText className="text-ember" size={24} /></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm"><div><p className="text-xs font-semibold text-ink/45">Gross</p><p className="mt-1 font-bold">{formatCurrency(entry.grossEarnings, currency)}</p></div><div><p className="text-xs font-semibold text-ink/45">Deductions</p><p className="mt-1 font-bold">{formatCurrency(entry.totalDeductions, currency)}</p></div></div><Button className="mt-5 w-full" variant="secondary" onClick={() => setSelected(entry)}><Eye size={16} />View payslip</Button></Card>)}</div><Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="My Payslip" description="Approved payroll record"><>{selected && <PayslipDetails entry={selected} currency={currency} />}</></Modal></div>;
}
