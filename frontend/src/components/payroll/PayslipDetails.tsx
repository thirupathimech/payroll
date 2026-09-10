import { useEffect, useRef, useState } from "react";
import { Building2, CalendarDays, Download, Landmark, ReceiptText } from "lucide-react";
import { getErrorMessage } from "../../api/client";
import { settingsApi } from "../../api/payroll";
import { downloadPdf as exportPdf } from "../../lib/reporting";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { formatCurrency } from "../../lib/format";
import type { CompanySettings, PayrollEntry, SalaryComponentCategory } from "../../types";
import { PayslipPdfReport } from "./PayslipPdfReport";

interface PayslipDetailsProps {
  entry: PayrollEntry;
  currency: string;
}

const groups: Array<{ category: SalaryComponentCategory; title: string }> = [
  { category: "EARNING", title: "Earnings" },
  { category: "REIMBURSEMENT", title: "Business reimbursements" },
  { category: "DEDUCTION", title: "Deductions" },
  { category: "EMPLOYER_CONTRIBUTION", title: "Employer contributions" },
];

function periodLabel(entry: PayrollEntry) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" })
    .format(new Date(entry.periodYear, entry.periodMonth - 1, 1));
}

export function PayslipDetails({ entry, currency }: PayslipDetailsProps) {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [printedAt, setPrintedAt] = useState("");
  const payslipPdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    settingsApi.get().then(setCompanySettings).catch(() => setCompanySettings(null));
  }, []);

  async function downloadPayslipPdf() {
    if (!payslipPdfRef.current) return;
    setDownloadingPdf(true);
    setPdfError("");
    const nextPrintedAt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date());
    setPrintedAt(nextPrintedAt);
    try {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const safeEmployeeCode = entry.employeeCode.replace(/[^a-z0-9_-]+/gi, "-");
      await exportPdf({
        element: payslipPdfRef.current,
        filename: `payslip-${safeEmployeeCode || "employee"}-${entry.periodYear}-${String(entry.periodMonth).padStart(2, "0")}.pdf`,
        orientation: "portrait",
        contextErrorMessage: "Unable to prepare the payslip PDF.",
        logoUrl: companySettings?.logoDataUrl,
        waitForRender: true,
      });
    } catch (apiError) {
      setPdfError(apiError instanceof Error ? apiError.message : getErrorMessage(apiError));
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-ink px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Payslip · {periodLabel(entry)}</p>
            <h3 className="mt-2 font-display text-2xl font-extrabold">{entry.employeeName}</h3>
            <p className="mt-1 text-sm text-white/65">{entry.employeeCode} · {entry.designationTitle || "Employee"}</p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="rounded-xl bg-white/10 px-4 py-3 sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Net pay</p>
              <p className="mt-1 text-2xl font-extrabold text-ember">{formatCurrency(entry.netPay, currency)}</p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => void downloadPayslipPdf()} disabled={downloadingPdf}>
              <Download size={15} />{downloadingPdf ? "Preparing PDF..." : "Download PDF"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink/45"><CalendarDays size={14} />Payable days</p><p className="mt-2 text-xl font-extrabold">{entry.payableDays} / {entry.periodDays}</p></Card>
        <Card className="p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink/45"><Building2 size={14} />Department</p><p className="mt-2 truncate text-sm font-bold">{entry.departmentName || "-"}</p></Card>
        <Card className="p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink/45"><Landmark size={14} />Bank account</p><p className="mt-2 truncate text-sm font-bold">{entry.bankAccountNumber || "Not provided"}</p></Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-line px-5 py-4"><p className="flex items-center gap-2 font-display text-lg font-extrabold"><ReceiptText size={19} className="text-fern" />Salary breakdown</p></div>
        <div className="divide-y divide-line">
          {groups.map((group) => {
            const lines = entry.componentLines.filter((line) => line.category === group.category);
            if (!lines.length) return null;
            return (
              <section key={group.category} className="px-5 py-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-ink/45">{group.title}</p>
                {lines.map((line) => <div key={`${group.category}-${line.code}`} className="flex justify-between gap-4 py-1 text-sm"><span className="text-ink/70">{line.name}</span><span className="font-bold text-ink">{formatCurrency(line.amount, currency)}</span></div>)}
              </section>
            );
          })}
          <section className="bg-moss/[0.04] px-5 py-4">
            <div className="flex justify-between gap-4 text-sm"><span className="font-semibold text-ink/70">Gross earnings</span><span className="font-bold">{formatCurrency(entry.grossEarnings, currency)}</span></div>
            <div className="mt-2 flex justify-between gap-4 text-sm"><span className="font-semibold text-ink/70">Total deductions</span><span className="font-bold">{formatCurrency(entry.totalDeductions, currency)}</span></div>
            {entry.reimbursementAmount > 0 && <div className="mt-2 flex justify-between gap-4 text-sm"><span className="font-semibold text-ink/70">Business reimbursements</span><span className="font-bold text-emerald-700">+ {formatCurrency(entry.reimbursementAmount, currency)}</span></div>}
            <div className="mt-3 flex justify-between gap-4 border-t border-moss/15 pt-3 text-base"><span className="font-extrabold">Net pay</span><span className="font-extrabold text-fern">{formatCurrency(entry.netPay, currency)}</span></div>
          </section>
        </div>
      </Card>

      <p className="text-xs leading-5 text-ink/50">Pay is prorated for joining or last-working dates, approved unpaid leave, and working-day absences or shortfalls in recorded hours without approved leave. Approved paid leave remains payable.</p>
      {pdfError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{pdfError}</p>}
      <div ref={payslipPdfRef} aria-hidden="true" className="pointer-events-none absolute -left-[10000px] top-0 w-[794px] bg-white">
        <PayslipPdfReport entry={entry} companySettings={companySettings} currency={currency} printedAt={printedAt} />
      </div>
    </div>
  );
}
