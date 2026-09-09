import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, ChevronDown, ClipboardList, Download, FileBarChart, RefreshCw, RotateCcw, Save, WalletCards, type LucideIcon } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { attendanceApi, departmentApi, employeeApi, salaryApi, settingsApi, shiftAssignmentApi } from "../api/payroll";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmployeeAutocomplete } from "../components/ui/EmployeeAutocomplete";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { CalendarOffReport } from "../components/reports/CalendarOffReport";
import { DownloadFormatDropdown, PdfOrientationDropdown } from "../components/reports/ReportDownloadControls";
import { hasRoleAccess, HR_ROLES } from "../lib/access";
import {
  csvCell,
  currentMonth,
  daysInMonth,
  downloadPdf as exportPdf,
  downloadTextFile,
  downloadXlsx,
  escapeHtml,
  loadStoredValue,
  type DownloadFormat,
  type PdfOrientation,
} from "../lib/reporting";
import type { AttendanceRecord, Employee, EmployeeSalaryResponse, SalaryComponentCategory, ShiftAssignment } from "../types";

const dayNumbers = Array.from({ length: 31 }, (_, index) => index + 1);
const SHIFT_TEMPLATE_STORAGE_KEY = "payroll.report.shift-assignment.template";
const PUNCH_TEMPLATE_STORAGE_KEY = "payroll.report.employee-punches.template";
const SALARY_TEMPLATE_STORAGE_KEY = "payroll.report.salary.template";
const MONTHS_IN_YEAR = 12;

type ReportCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  onOpen: () => void;
};

function ReportCard({ eyebrow, title, description, icon: Icon, iconClassName, onOpen }: ReportCardProps) {
  return (
    <Card
      className="group flex h-full cursor-pointer flex-col transition hover:-translate-y-0.5 hover:shadow-card"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${iconClassName}`}>
          <Icon size={26} />
        </div>
        <span className="rounded-full bg-moss/5 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink/50">Report</span>
      </div>
      <div className="mt-6 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">{eyebrow}</p>
        <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-ink/60">{description}</p>
      </div>
      <Button type="button" className="mt-6 w-full justify-center" onClick={(event) => { event.stopPropagation(); onOpen(); }}>
        Open report
      </Button>
    </Card>
  );
}

const defaultTemplate = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>{{REPORT_TITLE}}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #18332d; background: #ffffff; font-family: Arial, sans-serif; }
    .report { padding: 20px; }
    .company-header { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 14px; text-align: left; }
    .company-header img { display: block; width: 72px; height: 54px; object-fit: contain; flex-shrink: 0; }
    .company-copy h2 { margin: 0; font-size: 20px; }
    .company-copy p { margin: 4px 0 0; color: #53665f; font-size: 11px; white-space: pre-line; }
    .report-title { margin: 0 0 6px; font-size: 24px; }
    .report-meta { margin: 0 0 18px; color: #53665f; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th { border: 1px solid #c7d6d0; background: #e8f0ed; padding: 5px 3px; font-size: 9px; line-height: 1.1; word-break: break-word; }
    td { border: 1px solid #d5e0dc; padding: 5px 3px; font-size: 9px; line-height: 1.1; word-break: break-word; overflow: hidden; }
    .approved-by { margin: 28px 0 0; font-size: 13px; font-weight: 700; }
  </style>
</head>
<body>
  <main class="report">
    <header class="company-header">
      {{COMPANY_LOGO}}
      <div class="company-copy">
        <h2>{{COMPANY_NAME}}</h2>
        <p>{{COMPANY_ADDRESS}}</p>
      </div>
    </header>
    <h1 class="report-title">{{REPORT_TITLE}}</h1>
    <p class="report-meta">Month: {{MONTH}} | Printed Time: {{PRINTED_AT}}</p>
    {{TABLE}}
    <p class="approved-by">Approved By: {{APPROVED_BY}}</p>
  </main>
</body>
</html>`;

function dateForMonthDay(month: string, day: number) {
  return `${month}-${String(day).padStart(2, "0")}`;
}

function shiftLabel(assignment: ShiftAssignment | undefined) {
  if (!assignment) return "-";
  return assignment.shiftCode || assignment.shiftName || "-";
}

function companyLogoMarkup(logoUrl: string) {
  return logoUrl ? `<img data-org-logo="true" src="${escapeHtml(logoUrl)}" alt="Organization logo" style="display:block;width:72px;height:54px;object-fit:contain;flex-shrink:0" />` : "";
}

function companyHeaderFallback(html: string, template: string, name: string, address: string, logoUrl: string) {
  const logo = companyLogoMarkup(logoUrl);
  if (template.includes("{{COMPANY_NAME}}") && template.includes("{{COMPANY_ADDRESS}}")) {
    if (!logo || html.includes("data-org-logo")) return html;
    const headerMatch = html.match(/<header\b([^>]*class=["'][^"']*company-header[^"']*["'][^>]*)>([\s\S]*?)<\/header>/i);
    if (!headerMatch) return html;
    const groupedStyles = "display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:14px;text-align:left;";
    const styledAttributes = /\sstyle\s*=\s*["'][^"']*["']/i.test(headerMatch[1])
      ? headerMatch[1].replace(/\sstyle\s*=\s*["'][^"']*["']/i, ` style="${groupedStyles}"`)
      : `${headerMatch[1]} style="${groupedStyles}"`;
    const companyContent = headerMatch[2].trim();
    const groupedContent = companyContent.includes("company-copy") ? companyContent : `<div class="company-copy">${companyContent}</div>`;
    return html.replace(headerMatch[0], `<header${styledAttributes}>${logo}${groupedContent}</header>`);
  }
  const logoGroup = logo ? `<div>${logo}</div>` : "";
  const header = `<div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:14px;text-align:left">${logoGroup}<div><h2 style="margin:0;font-size:20px">${escapeHtml(name || "Company")}</h2><p style="margin:4px 0 0;color:#53665f;font-size:11px;white-space:pre-line">${escapeHtml(address || "").replace(/\r?\n/g, "<br />")}</p></div></div>`;
  const bodyTag = html.match(/<body[^>]*>/i)?.[0];
  return bodyTag ? html.replace(bodyTag, `${bodyTag}${header}`) : `${header}${html}`;
}

function roundSalaryMoney(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const rounded = Math.round((safeValue + Number.EPSILON) * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function monthlySalaryAmount(annualAmount: number) {
  return roundSalaryMoney(annualAmount / MONTHS_IN_YEAR);
}

function formatReportSalary(value: number, currency: string) {
  const options = {
    style: "currency" as const,
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };
  try {
    return new Intl.NumberFormat("en-IN", options).format(roundSalaryMoney(value));
  } catch {
    return new Intl.NumberFormat("en-IN", { ...options, currency: "USD" }).format(roundSalaryMoney(value));
  }
}

function salaryComponentAmount(component: EmployeeSalaryResponse["components"][number], annualCtc: number) {
  const value = Number(component.value) || 0;
  return roundSalaryMoney(component.valueType === "PERCENTAGE" ? annualCtc * value / 100 : value);
}

function salaryCategoryLabel(category: SalaryComponentCategory) {
  if (category === "EMPLOYER_CONTRIBUTION") return "Employer contribution";
  if (category === "DEDUCTION") return "Deduction";
  return "Earning";
}

function summarizeSalary(profile: EmployeeSalaryResponse) {
  const componentAmounts = Object.fromEntries(profile.components.map((component) => [
    component.code,
    component.enabled ? salaryComponentAmount(component, profile.ctc) : 0,
  ]));
  const totalFor = (category: SalaryComponentCategory) => profile.components
    .filter((component) => component.enabled && component.category === category)
    .reduce((total, component) => total + salaryComponentAmount(component, profile.ctc), 0);
  const earningsAnnual = roundSalaryMoney(totalFor("EARNING"));
  const employerContributionsAnnual = roundSalaryMoney(totalFor("EMPLOYER_CONTRIBUTION"));
  const deductionsAnnual = roundSalaryMoney(totalFor("DEDUCTION"));
  const takeHomeAnnual = roundSalaryMoney(earningsAnnual - deductionsAnnual);
  return {
    profile,
    componentAmounts,
    ctcAnnual: roundSalaryMoney(profile.ctc),
    earningsAnnual,
    employerContributionsAnnual,
    deductionsAnnual,
    takeHomeAnnual,
  };
}

export function ReportsPage() {
  const { user, currency } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState("");
  const [template, setTemplate] = useState(() => loadStoredValue(SHIFT_TEMPLATE_STORAGE_KEY, defaultTemplate));
  const [pdfOrientation, setPdfOrientation] = useState<PdfOrientation>("landscape");
  const [shiftDownloadFormat, setShiftDownloadFormat] = useState<DownloadFormat>("pdf");
  const [shiftReportOpen, setShiftReportOpen] = useState(false);
  const [printedAt, setPrintedAt] = useState(() => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date()));
  const [punchFrom, setPunchFrom] = useState(`${currentMonth()}-01`);
  const [punchTo, setPunchTo] = useState(`${currentMonth()}-${String(daysInMonth(currentMonth())).padStart(2, "0")}`);
  const [punchRecords, setPunchRecords] = useState<AttendanceRecord[]>([]);
  const [punchBranchFilter, setPunchBranchFilter] = useState("");
  const [punchDepartmentFilter, setPunchDepartmentFilter] = useState("");
  const [punchDesignationFilter, setPunchDesignationFilter] = useState("");
  const [selectedPunchEmployeeCode, setSelectedPunchEmployeeCode] = useState("");
  const [punchTemplate, setPunchTemplate] = useState(() => loadStoredValue(PUNCH_TEMPLATE_STORAGE_KEY, defaultTemplate));
  const [punchPdfOrientation, setPunchPdfOrientation] = useState<PdfOrientation>("landscape");
  const [punchDownloadFormat, setPunchDownloadFormat] = useState<DownloadFormat>("pdf");
  const [punchReportOpen, setPunchReportOpen] = useState(false);
  const [punchPrintedAt, setPunchPrintedAt] = useState(() => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date()));
  const [salaryMonth, setSalaryMonth] = useState(currentMonth());
  const [salaryProfiles, setSalaryProfiles] = useState<EmployeeSalaryResponse[]>([]);
  const [salaryBranchFilter, setSalaryBranchFilter] = useState("");
  const [salaryDepartmentFilter, setSalaryDepartmentFilter] = useState("");
  const [salaryDesignationFilter, setSalaryDesignationFilter] = useState("");
  const [selectedSalaryEmployeeCode, setSelectedSalaryEmployeeCode] = useState("");
  const [salaryTemplate, setSalaryTemplate] = useState(() => loadStoredValue(SALARY_TEMPLATE_STORAGE_KEY, defaultTemplate));
  const [salaryPdfOrientation, setSalaryPdfOrientation] = useState<PdfOrientation>("landscape");
  const [salaryDownloadFormat, setSalaryDownloadFormat] = useState<DownloadFormat>("pdf");
  const [salaryReportOpen, setSalaryReportOpen] = useState(false);
  const [salaryPrintedAt, setSalaryPrintedAt] = useState(() => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date()));
  const [salaryReportLoaded, setSalaryReportLoaded] = useState(false);
  const [loadingPunches, setLoadingPunches] = useState(false);
  const [downloadingPunches, setDownloadingPunches] = useState(false);
  const [loadingSalaries, setLoadingSalaries] = useState(false);
  const [downloadingSalaries, setDownloadingSalaries] = useState(false);
  const [templateMessage, setTemplateMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);
  const pdfReportRef = useRef<HTMLDivElement>(null);
  const punchPdfReportRef = useRef<HTMLDivElement>(null);
  const salaryPdfReportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      employeeApi.search({ status: "ACTIVE", page: 0, size: 1000 }),
      departmentApi.active(),
    ])
      .then(([employeePage, departmentItems]) => {
        setEmployees(employeePage.content);
        setDepartments(departmentItems.map((department) => ({ id: department.id, name: department.name })));
      })
      .catch((apiError) => setError(getErrorMessage(apiError)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    settingsApi.get().then((settings) => {
      setCompanyName(settings.companyName || "");
      setCompanyAddress(settings.address || "");
      setCompanyLogo(settings.logoDataUrl || "");
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const startDate = dateForMonthDay(month, 1);
    const endDate = dateForMonthDay(month, daysInMonth(month));
    setLoadingAssignments(true);
    shiftAssignmentApi.search({ startDate, endDate })
      .then(setAssignments)
      .catch((apiError) => setError(getErrorMessage(apiError)))
      .finally(() => setLoadingAssignments(false));
  }, [month]);

  useEffect(() => {
    if (!punchFrom || !punchTo || punchTo < punchFrom) {
      setPunchRecords([]);
      return;
    }
    setLoadingPunches(true);
    attendanceApi.list(punchFrom, punchTo)
      .then(setPunchRecords)
      .catch((apiError) => setError(getErrorMessage(apiError)))
      .finally(() => setLoadingPunches(false));
  }, [punchFrom, punchTo]);

  const branchOptions = useMemo(() => [...new Set(employees.map((employee) => employee.branchName).filter(Boolean) as string[])].sort(), [employees]);
  const designationOptions = useMemo(() => [...new Set(employees.map((employee) => employee.designationTitle).filter(Boolean))].sort(), [employees]);
  const shiftOptions = useMemo(() => [...new Set(assignments.map((assignment) => assignment.shiftCode || assignment.shiftName).filter(Boolean))].sort(), [assignments]);
  const assignmentLookup = useMemo(() => new Map(assignments.map((assignment) => [`${assignment.employeeId}|${assignment.date}`, assignment])), [assignments]);
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesBranch = !branchFilter || employee.branchName === branchFilter;
      const matchesDepartment = !departmentFilter || employee.departmentId === Number(departmentFilter);
      const matchesDesignation = !designationFilter || employee.designationTitle === designationFilter;
      const matchesEmployee = !selectedEmployeeCode || employee.employeeCode === selectedEmployeeCode;
      const matchesShift = !shiftFilter || dayNumbers.some((day) => shiftLabel(assignmentLookup.get(`${employee.id}|${dateForMonthDay(month, day)}`)) === shiftFilter);
      return matchesBranch && matchesDepartment && matchesDesignation && matchesEmployee && matchesShift;
    });
  }, [assignmentLookup, branchFilter, departmentFilter, designationFilter, employees, month, selectedEmployeeCode, shiftFilter]);

  const filteredPunchRows = useMemo(() => punchRecords.flatMap((record) => {
    const employee = employees.find((item) => item.id === record.employeeId);
    if (!employee) return [];
    if (punchBranchFilter && employee.branchName !== punchBranchFilter) return [];
    if (punchDepartmentFilter && employee.departmentId !== Number(punchDepartmentFilter)) return [];
    if (punchDesignationFilter && employee.designationTitle !== punchDesignationFilter) return [];
    if (selectedPunchEmployeeCode && employee.employeeCode !== selectedPunchEmployeeCode) return [];
    return [{ record, employee }];
  }), [employees, punchBranchFilter, punchDepartmentFilter, punchDesignationFilter, punchRecords, selectedPunchEmployeeCode]);

  const filteredSalaryProfiles = useMemo(() => salaryProfiles.filter((profile) => {
    const matchesBranch = !salaryBranchFilter || profile.branchName === salaryBranchFilter;
    const matchesDepartment = !salaryDepartmentFilter || profile.departmentName === salaryDepartmentFilter;
    const matchesDesignation = !salaryDesignationFilter || profile.designationTitle === salaryDesignationFilter;
    const matchesEmployee = !selectedSalaryEmployeeCode || profile.employeeCode === selectedSalaryEmployeeCode;
    return matchesBranch && matchesDepartment && matchesDesignation && matchesEmployee;
  }), [salaryBranchFilter, salaryDepartmentFilter, salaryDesignationFilter, salaryProfiles, selectedSalaryEmployeeCode]);

  const salaryComponentColumns = useMemo(() => {
    const seen = new Set<string>();
    return salaryProfiles.flatMap((profile) => profile.components.flatMap((component) => {
      if (seen.has(component.code)) return [];
      seen.add(component.code);
      return [{ code: component.code, name: component.name, category: component.category }];
    }));
  }, [salaryProfiles]);

  const salaryReportData = useMemo(() => {
    const headers = [
      "Employee Code", "Name", "Branch", "Department", "Designation",
      "Annual CTC", "Monthly CTC", "Gross Annual", "Gross Monthly",
      "Employer Contributions Annual", "Employer Contributions Monthly",
      "Deductions Annual", "Deductions Monthly", "Take-home Annual", "Take-home Monthly",
      ...salaryComponentColumns.map((component) => `${component.name} (${salaryCategoryLabel(component.category)}, Annual)`),
    ];
    const rows = filteredSalaryProfiles.map(summarizeSalary).map((summary) => {
      const { profile } = summary;
      return [
        profile.employeeCode,
        profile.employeeName,
        profile.branchName || "-",
        profile.departmentName,
        profile.designationTitle,
        formatReportSalary(summary.ctcAnnual, currency),
        formatReportSalary(monthlySalaryAmount(summary.ctcAnnual), currency),
        formatReportSalary(summary.earningsAnnual, currency),
        formatReportSalary(monthlySalaryAmount(summary.earningsAnnual), currency),
        formatReportSalary(summary.employerContributionsAnnual, currency),
        formatReportSalary(monthlySalaryAmount(summary.employerContributionsAnnual), currency),
        formatReportSalary(summary.deductionsAnnual, currency),
        formatReportSalary(monthlySalaryAmount(summary.deductionsAnnual), currency),
        formatReportSalary(summary.takeHomeAnnual, currency),
        formatReportSalary(monthlySalaryAmount(summary.takeHomeAnnual), currency),
        ...salaryComponentColumns.map((component) => formatReportSalary(summary.componentAmounts[component.code] || 0, currency)),
      ];
    });
    const totals = filteredSalaryProfiles.map(summarizeSalary).reduce((total, summary) => ({
      ctcAnnual: total.ctcAnnual + summary.ctcAnnual,
      earningsAnnual: total.earningsAnnual + summary.earningsAnnual,
      employerContributionsAnnual: total.employerContributionsAnnual + summary.employerContributionsAnnual,
      deductionsAnnual: total.deductionsAnnual + summary.deductionsAnnual,
      takeHomeAnnual: total.takeHomeAnnual + summary.takeHomeAnnual,
      componentAmounts: salaryComponentColumns.reduce((components, component) => ({
        ...components,
        [component.code]: (components[component.code] || 0) + (summary.componentAmounts[component.code] || 0),
      }), total.componentAmounts as Record<string, number>),
    }), {
      ctcAnnual: 0,
      earningsAnnual: 0,
      employerContributionsAnnual: 0,
      deductionsAnnual: 0,
      takeHomeAnnual: 0,
      componentAmounts: {} as Record<string, number>,
    });
    return { headers, rows, totals };
  }, [currency, filteredSalaryProfiles, salaryComponentColumns]);

  const tableHtml = useMemo(() => {
    const headerCells = ["Employee Code", "Name", "Branch", "Department", "Designation", ...dayNumbers.map(String)]
      .map((label) => `<th style="border:1px solid #c7d6d0;background:#e8f0ed;padding:5px 3px;font-size:9px;line-height:1.1;word-break:break-word;overflow:hidden">${escapeHtml(label)}</th>`)
      .join("");
    const rows = filteredEmployees.map((employee) => {
      const cells = [employee.employeeCode, employee.fullName, employee.branchName || "-", employee.departmentName, employee.designationTitle]
        .map((value) => `<td style="border:1px solid #d5e0dc;padding:5px 3px;font-size:9px;line-height:1.1;word-break:break-word;overflow:hidden">${escapeHtml(value)}</td>`)
        .join("");
      const dayCells = dayNumbers.map((day) => {
        const value = day > daysInMonth(month) ? "-" : shiftLabel(assignmentLookup.get(`${employee.id}|${dateForMonthDay(month, day)}`));
        return `<td style="border:1px solid #d5e0dc;padding:5px 2px;text-align:center;font-size:9px;line-height:1.1;word-break:break-word;overflow:hidden">${escapeHtml(value)}</td>`;
      }).join("");
      return `<tr>${cells}${dayCells}</tr>`;
    }).join("");
    const emptyRow = `<tr><td colspan="36" style="border:1px solid #d5e0dc;padding:14px;text-align:center;color:#60736c;font-size:11px">No employees found for the selected filters.</td></tr>`;
    return `<table style="border-collapse:collapse;width:100%;table-layout:fixed"><thead><tr>${headerCells}</tr></thead><tbody>${rows || emptyRow}</tbody></table>`;
  }, [assignmentLookup, filteredEmployees, month]);

  const renderedHtml = useMemo(() => companyHeaderFallback(template
    .split("{{REPORT_TITLE}}").join("Shift Assignment Report")
    .split("{{COMPANY_NAME}}").join(escapeHtml(companyName || "Company"))
    .split("{{COMPANY_ADDRESS}}").join(escapeHtml(companyAddress || "").replace(/\r?\n/g, "<br />"))
    .split("{{COMPANY_LOGO}}").join(companyLogoMarkup(companyLogo))
    .split("{{MONTH}}").join(new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${month}-01T00:00:00`)))
    .split("{{PRINTED_AT}}").join(printedAt)
    .split("{{TABLE}}").join(tableHtml)
    .split("{{APPROVED_BY}}").join("____________________________"), template, companyName, companyAddress, companyLogo), [companyAddress, companyLogo, companyName, month, printedAt, tableHtml, template]);

  const punchTableHtml = useMemo(() => {
    const headers = ["Employee Code", "Name", "Branch", "Department", "Designation", "Punch Date", "IN Date", "IN Time", "OUT Date", "OUT Time", "Source"];
    const headerCells = headers.map((label) => `<th style="border:1px solid #c7d6d0;background:#e8f0ed;padding:6px 5px;font-size:9px;line-height:1.1;word-break:break-word">${escapeHtml(label)}</th>`).join("");
    const rows = filteredPunchRows.map(({ record, employee }) => {
      const values = [
        employee.employeeCode,
        employee.fullName,
        employee.branchName || "-",
        employee.departmentName,
        employee.designationTitle,
        record.date,
        record.clockInDate || record.date,
        record.clockIn || "-",
        record.clockOutDate || (record.clockOut ? record.date : "-"),
        record.clockOut || "-",
        record.source,
      ];
      return `<tr>${values.map((value, index) => `<td style="border:1px solid #d5e0dc;padding:6px 5px;font-size:9px;line-height:1.1;word-break:break-word;text-align:${index > 4 ? "center" : "left"}">${escapeHtml(value)}</td>`).join("")}</tr>`;
    }).join("");
    const emptyRow = `<tr><td colspan="11" style="border:1px solid #d5e0dc;padding:14px;text-align:center;color:#60736c;font-size:11px">No punch records found for the selected filters.</td></tr>`;
    return `<table style="border-collapse:collapse;width:100%;table-layout:fixed"><thead><tr>${headerCells}</tr></thead><tbody>${rows || emptyRow}</tbody></table>`;
  }, [filteredPunchRows]);

  const renderedPunchHtml = useMemo(() => companyHeaderFallback(punchTemplate
    .split("{{REPORT_TITLE}}").join("Employee Punches Report")
    .split("{{COMPANY_NAME}}").join(escapeHtml(companyName || "Company"))
    .split("{{COMPANY_ADDRESS}}").join(escapeHtml(companyAddress || "").replace(/\r?\n/g, "<br />"))
    .split("{{COMPANY_LOGO}}").join(companyLogoMarkup(companyLogo))
    .split("{{MONTH}}").join(`${punchFrom || "-"} to ${punchTo || "-"}`)
    .split("{{PRINTED_AT}}").join(punchPrintedAt)
    .split("{{TABLE}}").join(punchTableHtml)
    .split("{{APPROVED_BY}}").join("____________________________"), punchTemplate, companyName, companyAddress, companyLogo), [companyAddress, companyLogo, companyName, punchFrom, punchPrintedAt, punchTableHtml, punchTemplate, punchTo]);

  const salaryTableHtml = useMemo(() => {
    const headerCells = salaryReportData.headers
      .map((label) => `<th style="border:1px solid #c7d6d0;background:#e8f0ed;padding:5px 3px;font-size:8px;line-height:1.1;word-break:break-word;overflow:hidden">${escapeHtml(label)}</th>`)
      .join("");
    const bodyRows = salaryReportData.rows.map((row) => `<tr>${row.map((value, index) => `<td style="border:1px solid #d5e0dc;padding:5px 3px;font-size:8px;line-height:1.1;word-break:break-word;overflow:hidden;text-align:${index > 4 ? "right" : "left"}">${escapeHtml(value)}</td>`).join("")}</tr>`).join("");
    const total = salaryReportData.totals;
    const totalValues = [
      "TOTAL", `${filteredSalaryProfiles.length} employee(s)`, "", "", "",
      formatReportSalary(total.ctcAnnual, currency), formatReportSalary(monthlySalaryAmount(total.ctcAnnual), currency),
      formatReportSalary(total.earningsAnnual, currency), formatReportSalary(monthlySalaryAmount(total.earningsAnnual), currency),
      formatReportSalary(total.employerContributionsAnnual, currency), formatReportSalary(monthlySalaryAmount(total.employerContributionsAnnual), currency),
      formatReportSalary(total.deductionsAnnual, currency), formatReportSalary(monthlySalaryAmount(total.deductionsAnnual), currency),
      formatReportSalary(total.takeHomeAnnual, currency), formatReportSalary(monthlySalaryAmount(total.takeHomeAnnual), currency),
      ...salaryComponentColumns.map((component) => formatReportSalary(total.componentAmounts[component.code] || 0, currency)),
    ];
    const totalRow = `<tr>${totalValues.map((value, index) => `<td style="border:1px solid #c7d6d0;background:#e8f0ed;padding:5px 3px;font-size:8px;font-weight:700;line-height:1.1;text-align:${index > 4 ? "right" : "left"}">${escapeHtml(value)}</td>`).join("")}</tr>`;
    const emptyRow = `<tr><td colspan="${salaryReportData.headers.length}" style="border:1px solid #d5e0dc;padding:14px;text-align:center;color:#60736c;font-size:11px">No salary records found for the selected filters.</td></tr>`;
    return `<table style="border-collapse:collapse;width:100%;table-layout:fixed"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows || emptyRow}</tbody>${bodyRows ? `<tfoot>${totalRow}</tfoot>` : ""}</table>`;
  }, [currency, filteredSalaryProfiles.length, salaryComponentColumns, salaryReportData]);

  const renderedSalaryHtml = useMemo(() => companyHeaderFallback(salaryTemplate
    .split("{{REPORT_TITLE}}").join("Salary Report")
    .split("{{COMPANY_NAME}}").join(escapeHtml(companyName || "Company"))
    .split("{{COMPANY_ADDRESS}}").join(escapeHtml(companyAddress || "").replace(/\r?\n/g, "<br />"))
    .split("{{COMPANY_LOGO}}").join(companyLogoMarkup(companyLogo))
    .split("{{MONTH}}").join(new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${salaryMonth}-01T00:00:00`)))
    .split("{{PRINTED_AT}}").join(salaryPrintedAt)
    .split("{{TABLE}}").join(salaryTableHtml)
    .split("{{APPROVED_BY}}").join("____________________________"), salaryTemplate, companyName, companyAddress, companyLogo), [companyAddress, companyLogo, companyName, salaryMonth, salaryPrintedAt, salaryTableHtml, salaryTemplate]);

  function saveTemplate(storageKey: string, value: string, label: string) {
    try {
      window.localStorage.setItem(storageKey, value);
      setTemplateMessage(`${label} template saved.`);
    } catch (storageError) {
      setTemplateMessage(storageError instanceof Error ? storageError.message : "Unable to save the template.");
    }
  }

  function resetTemplate(storageKey: string, setValue: (value: string) => void, label: string) {
    setValue(defaultTemplate);
    try {
      window.localStorage.setItem(storageKey, defaultTemplate);
      setTemplateMessage(`${label} template reset to the default HTML.`);
    } catch (storageError) {
      setTemplateMessage(storageError instanceof Error ? storageError.message : "Unable to reset the template.");
    }
  }

  async function loadSalaryReport() {
    setLoadingSalaries(true);
    setError("");
    try {
      setSalaryProfiles(await salaryApi.report());
      setSalaryReportLoaded(true);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setLoadingSalaries(false);
    }
  }

  function openSalaryReport() {
    setSalaryReportOpen(true);
    if (!salaryReportLoaded && !loadingSalaries) void loadSalaryReport();
  }

  async function downloadPdf() {
    if (!pdfReportRef.current) return;
    setDownloading(true);
    setError("");
    try {
      setPrintedAt(new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date()));
      await exportPdf({
        element: pdfReportRef.current,
        filename: `shift-assignment-report-${month}-${pdfOrientation}.pdf`,
        orientation: pdfOrientation,
        contextErrorMessage: "Unable to prepare the PDF preview.",
        logoUrl: companyLogo || undefined,
        waitForRender: true,
      });
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : getErrorMessage(apiError));
    } finally {
      setDownloading(false);
    }
  }

  async function downloadShiftReport() {
    if (shiftDownloadFormat === "pdf") return downloadPdf();
    setError("");
    try {
      const headers = ["Employee Code", "Name", "Branch", "Department", "Designation", ...dayNumbers.map(String)];
      const rows = filteredEmployees.map((employee) => [
        employee.employeeCode,
        employee.fullName,
        employee.branchName || "-",
        employee.departmentName,
        employee.designationTitle,
        ...dayNumbers.map((day) => day > daysInMonth(month) ? "-" : shiftLabel(assignmentLookup.get(`${employee.id}|${dateForMonthDay(month, day)}`))),
      ]);
      if (shiftDownloadFormat === "csv") downloadTextFile([[companyName || "Company"], [companyAddress || ""], [], headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n"), `shift-assignment-report-${month}.csv`);
      else await downloadXlsx({
        headers,
        rows,
        filename: `shift-assignment-report-${month}.xlsx`,
        worksheetName: "Report",
        companyName,
        companyAddress,
      });
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : getErrorMessage(apiError));
    }
  }

  async function downloadPunchPdf() {
    if (!punchPdfReportRef.current) return;
    setDownloadingPunches(true);
    setError("");
    try {
      setPunchPrintedAt(new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date()));
      await exportPdf({
        element: punchPdfReportRef.current,
        filename: `employee-punches-report-${punchFrom || "from"}-${punchTo || "to"}-${punchPdfOrientation}.pdf`,
        orientation: punchPdfOrientation,
        contextErrorMessage: "Unable to prepare the PDF preview.",
        logoUrl: companyLogo || undefined,
        waitForRender: true,
      });
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : getErrorMessage(apiError));
    } finally {
      setDownloadingPunches(false);
    }
  }

  async function downloadPunchReport() {
    if (punchDownloadFormat === "pdf") return downloadPunchPdf();
    setError("");
    try {
      const headers = ["Employee Code", "Name", "Branch", "Department", "Designation", "Punch Date", "IN Date", "IN Time", "OUT Date", "OUT Time", "Source"];
      const rows = filteredPunchRows.map(({ record, employee }) => [employee.employeeCode, employee.fullName, employee.branchName || "-", employee.departmentName, employee.designationTitle, record.date, record.clockInDate || record.date, record.clockIn || "-", record.clockOutDate || (record.clockOut ? record.date : "-"), record.clockOut || "-", record.source]);
      if (punchDownloadFormat === "csv") downloadTextFile([[companyName || "Company"], [companyAddress || ""], [], headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n"), `employee-punches-report-${punchFrom || "from"}-${punchTo || "to"}.csv`);
      else await downloadXlsx({
        headers,
        rows,
        filename: `employee-punches-report-${punchFrom || "from"}-${punchTo || "to"}.xlsx`,
        worksheetName: "Report",
        companyName,
        companyAddress,
      });
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : getErrorMessage(apiError));
    }
  }

  async function downloadSalaryPdf() {
    if (!salaryPdfReportRef.current) return;
    setDownloadingSalaries(true);
    setError("");
    try {
      setSalaryPrintedAt(new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date()));
      await exportPdf({
        element: salaryPdfReportRef.current,
        filename: `salary-report-${salaryMonth}-${salaryPdfOrientation}.pdf`,
        orientation: salaryPdfOrientation,
        contextErrorMessage: "Unable to prepare the salary report PDF preview.",
        logoUrl: companyLogo || undefined,
        waitForRender: true,
      });
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : getErrorMessage(apiError));
    } finally {
      setDownloadingSalaries(false);
    }
  }

  async function downloadSalaryReport() {
    if (salaryDownloadFormat === "pdf") return downloadSalaryPdf();
    setDownloadingSalaries(true);
    setError("");
    try {
      if (salaryDownloadFormat === "csv") downloadTextFile([[companyName || "Company"], [companyAddress || ""], [], salaryReportData.headers, ...salaryReportData.rows].map((row) => row.map(csvCell).join(",")).join("\r\n"), `salary-report-${salaryMonth}.csv`);
      else await downloadXlsx({
        headers: salaryReportData.headers,
        rows: salaryReportData.rows,
        filename: `salary-report-${salaryMonth}.xlsx`,
        worksheetName: "Report",
        companyName,
        companyAddress,
      });
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : getErrorMessage(apiError));
    } finally {
      setDownloadingSalaries(false);
    }
  }

  return <div className="space-y-6">
    <Card><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Reports</p><h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Reports</h2><p className="mt-2 text-sm text-ink/60">Choose a report to open its filters, preview, and download options.</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-ember text-ink shadow-glow"><FileBarChart size={22} /></div></div></Card>
    <div className="grid gap-4 md:grid-cols-2">
      <ReportCard
        eyebrow="Attendance setup"
        title="Shift Assignment"
        description="View role-scoped employee schedules by month and download the formatted report."
        icon={CalendarClock}
        iconClassName="bg-moss text-white"
        onOpen={() => setShiftReportOpen(true)}
      />
      <ReportCard
        eyebrow="Attendance"
        title="Employee Punches"
        description="Download employee IN/OUT punch details with date, time, branch, and department filters."
        icon={ClipboardList}
        iconClassName="bg-lagoon text-white"
        onOpen={() => setPunchReportOpen(true)}
      />
      <CalendarOffReport />
      {hasRoleAccess(user, HR_ROLES) && (
        <ReportCard
          eyebrow="Payroll"
          title="Salary Report"
          description="Review employee CTC, earnings, employer contributions, deductions, and estimated take-home."
          icon={WalletCards}
          iconClassName="bg-ember text-ink"
          onOpen={openSalaryReport}
        />
      )}
    </div>
    <Modal title="Shift Assignment Report" description="Filters, full HTML template, live preview, and A4 PDF download" open={shiftReportOpen} onClose={() => setShiftReportOpen(false)}>
      <div className="flex flex-col gap-6">
        <Card><div className="mb-5 flex items-center justify-between"><div><h3 className="font-display text-xl font-extrabold">Shift Assignment</h3><p className="mt-1 text-sm text-ink/60">Filters apply only to the employees and assignments allowed for your role.</p></div>{loadingAssignments && <RefreshCw className="animate-spin text-fern" size={18} />}</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Input label="Report month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><Select label="Branch" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}><option value="">All branches</option>{branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</Select><Select label="Department" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}><option value="">All departments</option>{departments.filter((department) => employees.some((employee) => employee.departmentId === department.id)).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select><Select label="Designation" value={designationFilter} onChange={(event) => setDesignationFilter(event.target.value)}><option value="">All designations</option>{designationOptions.map((designation) => <option key={designation} value={designation}>{designation}</option>)}</Select><Select label="Shift" value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)}><option value="">All shifts</option>{shiftOptions.map((shift) => <option key={shift} value={shift}>{shift}</option>)}</Select><EmployeeAutocomplete label="Employee code / name" value={selectedEmployeeCode} employees={employees} onChange={setSelectedEmployeeCode} placeholder="Search code or name" /></div><p className="mt-4 text-xs font-semibold text-ink/50">Showing {filteredEmployees.length} of {employees.length} role-scoped employee(s).</p></Card>
        <details className="group order-last overflow-hidden rounded-2xl border border-line bg-white/85 shadow-card backdrop-blur-xl">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-ink sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
            <div>
              <h3 className="font-display text-xl font-extrabold">HTML template</h3>
              <p className="mt-1 text-sm text-ink/60">Expand to edit the report HTML and download settings.</p>
            </div>
            <ChevronDown className="shrink-0 text-fern transition-transform group-open:rotate-180" size={20} />
          </summary>
          <div className="border-t border-moss/10 p-4 sm:p-6">
            <Card><div className="flex flex-col gap-3 border-b border-moss/10 pb-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-display text-xl font-extrabold">Full HTML template</h3><p className="mt-1 text-sm text-ink/60">Edit the complete HTML/CSS. Placeholders: &#123;&#123;COMPANY_LOGO&#125;&#125;, &#123;&#123;COMPANY_NAME&#125;&#125;, &#123;&#123;COMPANY_ADDRESS&#125;&#125;, &#123;&#123;REPORT_TITLE&#125;&#125;, &#123;&#123;MONTH&#125;&#125;, &#123;&#123;PRINTED_AT&#125;&#125;, &#123;&#123;TABLE&#125;&#125;, &#123;&#123;APPROVED_BY&#125;&#125;.</p></div><div className="flex flex-wrap items-center gap-3"><Button type="button" variant="secondary" onClick={() => saveTemplate(SHIFT_TEMPLATE_STORAGE_KEY, template, "Shift assignment")}><Save size={17} />Save template</Button><Button type="button" variant="ghost" onClick={() => resetTemplate(SHIFT_TEMPLATE_STORAGE_KEY, setTemplate, "Shift assignment")}><RotateCcw size={17} />Reset template</Button></div></div><textarea className="mt-5 min-h-80 w-full rounded-2xl border border-moss/15 bg-ink/[0.03] p-4 font-mono text-xs leading-5 text-ink outline-none focus:border-fern focus:ring-4 focus:ring-fern/10" value={template} onChange={(event) => setTemplate(event.target.value)} aria-label="Full report HTML template" />{templateMessage && <p className="mt-3 text-sm font-semibold text-fern">{templateMessage}</p>}</Card>
          </div>
        </details>
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <Card><div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><h3 className="font-display text-xl font-extrabold">Live preview</h3><p className="mt-1 text-sm text-ink/60">This exact HTML preview is converted to PDF.</p></div><div className="flex flex-wrap items-end gap-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{filteredEmployees.length} employee(s)</span><PdfOrientationDropdown value={pdfOrientation} onChange={setPdfOrientation} /><DownloadFormatDropdown value={shiftDownloadFormat} onChange={setShiftDownloadFormat} /><Button onClick={downloadShiftReport} disabled={downloading || loading || loadingAssignments}><Download size={17} />{downloading ? "Creating PDF..." : `Download ${shiftDownloadFormat.toUpperCase()}`}</Button></div></div><div ref={reportRef} className="overflow-x-auto rounded-2xl border border-moss/10 bg-white p-2" dangerouslySetInnerHTML={{ __html: renderedHtml }} /></Card>
        <div ref={pdfReportRef} aria-hidden="true" className="pointer-events-none absolute -left-[10000px] top-0 bg-white" style={{ width: pdfOrientation === "landscape" ? "1123px" : "794px" }} dangerouslySetInnerHTML={{ __html: renderedHtml }} />
      </div>
    </Modal>
    <Modal title="Employee Punches Report" description="Role-scoped punch details, full HTML template, live preview, and A4 PDF download" open={punchReportOpen} onClose={() => setPunchReportOpen(false)}>
      <div className="flex flex-col gap-6">
        <Card><div className="mb-5 flex items-center justify-between"><div><h3 className="font-display text-xl font-extrabold">Employee Punches</h3><p className="mt-1 text-sm text-ink/60">Only punch records for employees allowed by your role are shown.</p></div>{loadingPunches && <RefreshCw className="animate-spin text-fern" size={18} />}</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Input label="From date" type="date" value={punchFrom} onChange={(event) => setPunchFrom(event.target.value)} /><Input label="To date" type="date" min={punchFrom} value={punchTo} onChange={(event) => setPunchTo(event.target.value)} /><Select label="Branch" value={punchBranchFilter} onChange={(event) => setPunchBranchFilter(event.target.value)}><option value="">All branches</option>{branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</Select><Select label="Department" value={punchDepartmentFilter} onChange={(event) => setPunchDepartmentFilter(event.target.value)}><option value="">All departments</option>{departments.filter((department) => employees.some((employee) => employee.departmentId === department.id)).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select><Select label="Designation" value={punchDesignationFilter} onChange={(event) => setPunchDesignationFilter(event.target.value)}><option value="">All designations</option>{designationOptions.map((designation) => <option key={designation} value={designation}>{designation}</option>)}</Select><EmployeeAutocomplete label="Employee code / name" value={selectedPunchEmployeeCode} employees={employees} onChange={setSelectedPunchEmployeeCode} placeholder="Search code or name" /></div><p className="mt-4 text-xs font-semibold text-ink/50">Showing {filteredPunchRows.length} punch record(s).</p></Card>
        <details className="group order-last overflow-hidden rounded-2xl border border-line bg-white/85 shadow-card backdrop-blur-xl">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-ink sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
            <div>
              <h3 className="font-display text-xl font-extrabold">HTML template</h3>
              <p className="mt-1 text-sm text-ink/60">Expand to edit the report HTML and download settings.</p>
            </div>
            <ChevronDown className="shrink-0 text-fern transition-transform group-open:rotate-180" size={20} />
          </summary>
          <div className="border-t border-moss/10 p-4 sm:p-6">
            <Card><div className="flex flex-col gap-3 border-b border-moss/10 pb-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-display text-xl font-extrabold">Full HTML template</h3><p className="mt-1 text-sm text-ink/60">Edit all HTML/CSS styles. Use &#123;&#123;COMPANY_LOGO&#125;&#125;, &#123;&#123;COMPANY_NAME&#125;&#125;, &#123;&#123;COMPANY_ADDRESS&#125;&#125;, &#123;&#123;REPORT_TITLE&#125;&#125;, &#123;&#123;MONTH&#125;&#125;, &#123;&#123;PRINTED_AT&#125;&#125;, &#123;&#123;TABLE&#125;&#125;, and &#123;&#123;APPROVED_BY&#125;&#125;.</p></div><div className="flex flex-wrap items-center gap-3"><Button type="button" variant="secondary" onClick={() => saveTemplate(PUNCH_TEMPLATE_STORAGE_KEY, punchTemplate, "Employee punches")}><Save size={17} />Save template</Button><Button type="button" variant="ghost" onClick={() => resetTemplate(PUNCH_TEMPLATE_STORAGE_KEY, setPunchTemplate, "Employee punches")}><RotateCcw size={17} />Reset template</Button></div></div><textarea className="mt-5 min-h-80 w-full rounded-2xl border border-moss/15 bg-ink/[0.03] p-4 font-mono text-xs leading-5 text-ink outline-none focus:border-fern focus:ring-4 focus:ring-fern/10" value={punchTemplate} onChange={(event) => setPunchTemplate(event.target.value)} aria-label="Full employee punches HTML template" />{templateMessage && <p className="mt-3 text-sm font-semibold text-fern">{templateMessage}</p>}</Card>
          </div>
        </details>
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <Card><div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><h3 className="font-display text-xl font-extrabold">Live preview</h3><p className="mt-1 text-sm text-ink/60">This exact HTML preview is converted to PDF.</p></div><div className="flex flex-wrap items-end gap-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{filteredPunchRows.length} punch record(s)</span><PdfOrientationDropdown value={punchPdfOrientation} onChange={setPunchPdfOrientation} /><DownloadFormatDropdown value={punchDownloadFormat} onChange={setPunchDownloadFormat} /><Button onClick={downloadPunchReport} disabled={downloadingPunches || loading || loadingPunches}><Download size={17} />{downloadingPunches ? "Creating PDF..." : `Download ${punchDownloadFormat.toUpperCase()}`}</Button></div></div><div className="overflow-x-auto rounded-2xl border border-moss/10 bg-white p-2" dangerouslySetInnerHTML={{ __html: renderedPunchHtml }} /></Card>
        <div ref={punchPdfReportRef} aria-hidden="true" className="pointer-events-none absolute -left-[10000px] top-0 bg-white" style={{ width: punchPdfOrientation === "landscape" ? "1123px" : "794px" }} dangerouslySetInnerHTML={{ __html: renderedPunchHtml }} />
      </div>
    </Modal>
    <Modal title="Salary Report" description="Current employee salary structures, full HTML template, live preview, and A4 PDF download" open={salaryReportOpen} onClose={() => setSalaryReportOpen(false)}>
      <div className="flex flex-col gap-6">
        <Card><div className="mb-5 flex items-center justify-between"><div><h3 className="font-display text-xl font-extrabold">Salary breakup</h3><p className="mt-1 text-sm text-ink/60">Salary figures are based on the current annual CTC structure. Only active employees are included.</p></div>{loadingSalaries && <RefreshCw className="animate-spin text-fern" size={18} />}</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Input label="Report month" type="month" value={salaryMonth} onChange={(event) => setSalaryMonth(event.target.value)} /><Select label="Branch" value={salaryBranchFilter} onChange={(event) => setSalaryBranchFilter(event.target.value)}><option value="">All branches</option>{branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</Select><Select label="Department" value={salaryDepartmentFilter} onChange={(event) => setSalaryDepartmentFilter(event.target.value)}><option value="">All departments</option>{departments.filter((department) => employees.some((employee) => employee.departmentId === department.id)).map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}</Select><Select label="Designation" value={salaryDesignationFilter} onChange={(event) => setSalaryDesignationFilter(event.target.value)}><option value="">All designations</option>{designationOptions.map((designation) => <option key={designation} value={designation}>{designation}</option>)}</Select><EmployeeAutocomplete label="Employee code / name" value={selectedSalaryEmployeeCode} employees={employees} onChange={setSelectedSalaryEmployeeCode} placeholder="Search code or name" /></div><p className="mt-4 text-xs font-semibold text-ink/50">{salaryReportLoaded ? `Showing ${filteredSalaryProfiles.length} of ${salaryProfiles.length} active employee(s).` : loadingSalaries ? "Loading salary structures..." : "Open the report to load salary structures."}</p></Card>
        <details className="group order-last overflow-hidden rounded-2xl border border-line bg-white/85 shadow-card backdrop-blur-xl">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-ink sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
            <div>
              <h3 className="font-display text-xl font-extrabold">HTML template</h3>
              <p className="mt-1 text-sm text-ink/60">Expand to edit the report HTML and download settings.</p>
            </div>
            <ChevronDown className="shrink-0 text-fern transition-transform group-open:rotate-180" size={20} />
          </summary>
          <div className="border-t border-moss/10 p-4 sm:p-6">
            <Card><div className="flex flex-col gap-3 border-b border-moss/10 pb-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-display text-xl font-extrabold">Full HTML template</h3><p className="mt-1 text-sm text-ink/60">Edit the complete HTML/CSS. Placeholders: &#123;&#123;COMPANY_LOGO&#125;&#125;, &#123;&#123;COMPANY_NAME&#125;&#125;, &#123;&#123;COMPANY_ADDRESS&#125;&#125;, &#123;&#123;REPORT_TITLE&#125;&#125;, &#123;&#123;MONTH&#125;&#125;, &#123;&#123;PRINTED_AT&#125;&#125;, &#123;&#123;TABLE&#125;&#125;, &#123;&#123;APPROVED_BY&#125;&#125;.</p></div><div className="flex flex-wrap items-center gap-3"><Button type="button" variant="secondary" onClick={() => saveTemplate(SALARY_TEMPLATE_STORAGE_KEY, salaryTemplate, "Salary")}><Save size={17} />Save template</Button><Button type="button" variant="ghost" onClick={() => resetTemplate(SALARY_TEMPLATE_STORAGE_KEY, setSalaryTemplate, "Salary")}><RotateCcw size={17} />Reset template</Button></div></div><textarea className="mt-5 min-h-80 w-full rounded-2xl border border-moss/15 bg-ink/[0.03] p-4 font-mono text-xs leading-5 text-ink outline-none focus:border-fern focus:ring-4 focus:ring-fern/10" value={salaryTemplate} onChange={(event) => setSalaryTemplate(event.target.value)} aria-label="Full salary report HTML template" />{templateMessage && <p className="mt-3 text-sm font-semibold text-fern">{templateMessage}</p>}</Card>
          </div>
        </details>
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <Card><div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><h3 className="font-display text-xl font-extrabold">Live preview</h3><p className="mt-1 text-sm text-ink/60">This exact HTML preview is converted to PDF.</p></div><div className="flex flex-wrap items-end gap-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{filteredSalaryProfiles.length} employee(s)</span><PdfOrientationDropdown value={salaryPdfOrientation} onChange={setSalaryPdfOrientation} /><DownloadFormatDropdown value={salaryDownloadFormat} onChange={setSalaryDownloadFormat} /><Button onClick={downloadSalaryReport} disabled={downloadingSalaries || loading || loadingSalaries || !salaryReportLoaded}><Download size={17} />{downloadingSalaries ? `Creating ${salaryDownloadFormat.toUpperCase()}...` : `Download ${salaryDownloadFormat.toUpperCase()}`}</Button></div></div><div className="overflow-x-auto rounded-2xl border border-moss/10 bg-white p-2" dangerouslySetInnerHTML={{ __html: renderedSalaryHtml }} /></Card>
        <div ref={salaryPdfReportRef} aria-hidden="true" className="pointer-events-none absolute -left-[10000px] top-0 bg-white" style={{ width: salaryPdfOrientation === "landscape" ? "1123px" : "794px" }} dangerouslySetInnerHTML={{ __html: renderedSalaryHtml }} />
      </div>
    </Modal>
  </div>;
}
