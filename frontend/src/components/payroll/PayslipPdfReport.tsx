import type { CSSProperties } from "react";
import { formatCurrency } from "../../lib/format";
import type { CompanySettings, PayrollComponentLine, PayrollEntry, SalaryComponentCategory } from "../../types";

interface PayslipPdfReportProps {
  entry: PayrollEntry;
  companySettings: CompanySettings | null;
  currency: string;
  printedAt: string;
}

const colors = {
  ink: "#18332d",
  moss: "#214e45",
  muted: "#64756f",
  line: "#d7e1dd",
  soft: "#f2f7f5",
  earning: "#e9f7ef",
  employer: "#f2edff",
  deduction: "#fff0f1",
};

function periodLabel(entry: PayrollEntry) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" })
    .format(new Date(entry.periodYear, entry.periodMonth - 1, 1));
}

function lineItems(entry: PayrollEntry, category: SalaryComponentCategory) {
  return entry.componentLines.filter((line) => line.category === category);
}

export function PayslipPdfReport({ entry, companySettings, currency, printedAt }: PayslipPdfReportProps) {
  const companyName = companySettings?.companyName || "Payroll HRMS";
  const legalName = companySettings?.legalName && companySettings.legalName !== companyName ? companySettings.legalName : "";
  const companyAddress = companySettings?.address || [companySettings?.addressLine1, companySettings?.addressLine2, companySettings?.city, companySettings?.state, companySettings?.postalCode, companySettings?.country].filter(Boolean).join(", ");
  const contactDetails = [companySettings?.email, companySettings?.phone, companySettings?.taxId ? `Tax ID: ${companySettings.taxId}` : ""].filter(Boolean).join(" | ");
  const employeeDetails = [entry.employeeCode, entry.designationTitle || "Employee", entry.departmentName || ""].filter(Boolean).join(" | ");
  const cell: CSSProperties = { borderBottom: `1px solid ${colors.line}`, padding: "9px 12px", fontSize: "11px", lineHeight: 1.35 };
  const amountCell: CSSProperties = { ...cell, textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };

  function renderLines(title: string, category: SalaryComponentCategory, background: string, totalLabel: string, total: number, note?: string) {
    const items = lineItems(entry, category);
    return <>
      <tr><td colSpan={2} style={{ ...cell, background, color: colors.ink, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "10px" }}>{title}</td></tr>
      {items.map((item: PayrollComponentLine) => <tr key={`${category}-${item.code}`}>
        <td style={cell}><strong>{item.name}</strong><div style={{ color: colors.muted, fontSize: "10px", marginTop: "2px" }}>{item.code}</div></td>
        <td style={amountCell}>{formatCurrency(item.amount, currency)}</td>
      </tr>)}
      {!items.length && <tr><td colSpan={2} style={{ ...cell, color: colors.muted }}>No items.</td></tr>}
      <tr><td style={{ ...cell, fontWeight: 800 }}>{totalLabel}{note ? <div style={{ color: colors.muted, fontSize: "10px", fontWeight: 400, marginTop: "2px" }}>{note}</div> : null}</td><td style={{ ...amountCell, fontWeight: 800 }}>{formatCurrency(total, currency)}</td></tr>
    </>;
  }

  return <article style={{ width: "794px", boxSizing: "border-box", padding: "34px 40px 30px", background: "#ffffff", color: colors.ink, fontFamily: "Arial, Helvetica, sans-serif" }}>
    <header style={{ borderBottom: `3px solid ${colors.moss}`, paddingBottom: "18px", marginBottom: "22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "28px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: colors.moss, fontSize: "22px", fontWeight: 800, letterSpacing: "0.01em" }}>{companyName}</div>
          {legalName && <div style={{ color: colors.muted, fontSize: "11px", marginTop: "4px" }}>{legalName}</div>}
          {companyAddress && <div style={{ color: colors.muted, fontSize: "10px", lineHeight: 1.45, marginTop: "8px", whiteSpace: "pre-line" }}>{companyAddress}</div>}
          {contactDetails && <div style={{ color: colors.muted, fontSize: "10px", lineHeight: 1.4, marginTop: "4px" }}>{contactDetails}</div>}
        </div>
        <div style={{ textAlign: "right", minWidth: "180px" }}>
          <div style={{ color: colors.moss, fontSize: "10px", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>Confidential</div>
          <div style={{ color: colors.ink, fontSize: "20px", fontWeight: 800, marginTop: "8px" }}>Payslip</div>
          <div style={{ color: colors.muted, fontSize: "11px", marginTop: "5px" }}>{periodLabel(entry)}</div>
        </div>
      </div>
    </header>

    <section style={{ border: `1px solid ${colors.line}`, borderRadius: "10px", padding: "16px 18px", background: colors.soft, marginBottom: "20px" }}>
      <div style={{ color: colors.muted, fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Employee details</div>
      <div style={{ color: colors.ink, fontSize: "19px", fontWeight: 800, marginTop: "6px" }}>{entry.employeeName}</div>
      <div style={{ color: colors.muted, fontSize: "11px", marginTop: "5px" }}>{employeeDetails}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "15px" }}>
        {[["Annual CTC", formatCurrency(entry.annualCtc, currency)], ["Bank account", entry.bankAccountNumber || "Not provided"], ["Payroll status", "Processed"]].map(([label, value]) => <div key={label} style={{ borderTop: `1px solid ${colors.line}`, paddingTop: "8px" }}><div style={{ color: colors.muted, fontSize: "9px", fontWeight: 800, textTransform: "uppercase" }}>{label}</div><div style={{ color: colors.ink, fontSize: "11px", fontWeight: 700, marginTop: "4px", overflowWrap: "anywhere" }}>{value}</div></div>)}
      </div>
    </section>

    <section style={{ marginBottom: "20px" }}>
      <div style={{ color: colors.moss, fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "9px" }}>Attendance and pay summary</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
        {[
          ["Payable days", `${entry.payableDays} / ${entry.periodDays}`],
          ["Attendance", `${entry.attendanceDays} / ${entry.workingDays}`],
          ["Unpaid / LOP", String(entry.unpaidLeaveDays)],
          ["Net pay", formatCurrency(entry.netPay, currency)],
        ].map(([label, value]) => <div key={label} style={{ border: `1px solid ${colors.line}`, borderRadius: "8px", padding: "11px 10px", background: "#ffffff" }}><div style={{ color: colors.muted, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", lineHeight: 1.2 }}>{label}</div><div style={{ color: colors.ink, fontSize: "13px", fontWeight: 800, marginTop: "6px", whiteSpace: "nowrap" }}>{value}</div></div>)}
      </div>
    </section>

    <section>
      <div style={{ color: colors.moss, fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "9px" }}>Salary breakdown</div>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead><tr style={{ background: colors.moss, color: "#ffffff" }}><th style={{ ...cell, borderBottom: 0, textAlign: "left", width: "68%" }}>Component</th><th style={{ ...amountCell, borderBottom: 0, width: "32%" }}>Amount</th></tr></thead>
        <tbody>
          {renderLines("Earnings", "EARNING", colors.earning, "Gross earnings", entry.grossEarnings)}
          {renderLines("Employer contributions", "EMPLOYER_CONTRIBUTION", colors.employer, "Employer contributions", entry.employerContributions, "Part of company cost; not deducted from net pay")}
          {renderLines("Deductions", "DEDUCTION", colors.deduction, "Total deductions", entry.totalDeductions)}
          <tr style={{ background: colors.moss, color: "#ffffff" }}><td style={{ ...cell, borderBottom: 0, fontWeight: 800, fontSize: "13px" }}>Net pay</td><td style={{ ...amountCell, borderBottom: 0, fontWeight: 800, fontSize: "13px" }}>{formatCurrency(entry.netPay, currency)}</td></tr>
        </tbody>
      </table>
    </section>

    <footer style={{ borderTop: `1px solid ${colors.line}`, marginTop: "26px", paddingTop: "12px", display: "flex", justifyContent: "space-between", gap: "20px", color: colors.muted, fontSize: "9px" }}><span>This is a system-generated payslip.</span><span>Printed: {printedAt}</span></footer>
  </article>;
}
