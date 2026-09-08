import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, FileBarChart, FileSpreadsheet, FileText, FileType2, RectangleHorizontal, RectangleVertical, RefreshCw, RotateCcw, Save } from "lucide-react";
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
import { hasRoleAccess, HR_ROLES } from "../lib/access";
import type { AttendanceRecord, Employee, EmployeeSalaryResponse, SalaryComponentCategory, ShiftAssignment } from "../types";

const dayNumbers = Array.from({ length: 31 }, (_, index) => index + 1);
const SHIFT_TEMPLATE_STORAGE_KEY = "payroll.report.shift-assignment.template";
const PUNCH_TEMPLATE_STORAGE_KEY = "payroll.report.employee-punches.template";
const SALARY_TEMPLATE_STORAGE_KEY = "payroll.report.salary.template";
const MONTHS_IN_YEAR = 12;

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
    .company-header { margin-bottom: 14px; text-align: center; }
    .company-header h2 { margin: 0; font-size: 20px; }
    .company-header p { margin: 4px 0 0; color: #53665f; font-size: 11px; white-space: pre-line; }
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
      <h2>{{COMPANY_NAME}}</h2>
      <p>{{COMPANY_ADDRESS}}</p>
    </header>
    <h1 class="report-title">{{REPORT_TITLE}}</h1>
    <p class="report-meta">Month: {{MONTH}} | Printed Time: {{PRINTED_AT}}</p>
    {{TABLE}}
    <p class="approved-by">Approved By: {{APPROVED_BY}}</p>
  </main>
</body>
</html>`;

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateForMonthDay(month: string, day: number) {
  return `${month}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(month: string) {
  const [year, value] = month.split("-").map(Number);
  return new Date(year, value, 0).getDate();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character] || character));
}

function loadTemplate(storageKey: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(storageKey) || fallback;
}

type PdfOrientation = "landscape" | "portrait";
type DownloadFormat = "pdf" | "xlsx" | "csv";

function OrientationDropdown({ value, onChange }: { value: PdfOrientation; onChange: (value: PdfOrientation) => void }) {
  const [open, setOpen] = useState(false);
  const selected = value === "landscape" ? { label: "Landscape", Icon: RectangleHorizontal } : { label: "Portrait", Icon: RectangleVertical };
  return <div className="relative min-w-36"><span className="mb-2 block text-sm font-semibold text-ink/80">Orientation</span><button type="button" className="flex w-full items-center justify-between gap-2 rounded-2xl border border-moss/15 bg-white/85 px-4 py-3 text-sm font-semibold text-ink" onClick={() => setOpen((current) => !current)}><span className="flex items-center gap-2"><selected.Icon size={16} className="text-fern" />{selected.label}</span><ChevronDown size={16} /></button>{open && <div className="absolute right-0 z-[110] mt-2 w-full min-w-40 rounded-2xl border border-moss/10 bg-white p-2 shadow-card"><button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-moss/8" onClick={() => { onChange("landscape"); setOpen(false); }}><RectangleHorizontal size={16} className="text-fern" />Landscape</button><button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-moss/8" onClick={() => { onChange("portrait"); setOpen(false); }}><RectangleVertical size={16} className="text-fern" />Portrait</button></div>}</div>;
}

function DownloadFormatDropdown({ value, onChange }: { value: DownloadFormat; onChange: (value: DownloadFormat) => void }) {
  const [open, setOpen] = useState(false);
  const options = [{ value: "pdf" as const, label: "PDF", Icon: FileText }, { value: "xlsx" as const, label: "XLSX", Icon: FileSpreadsheet }, { value: "csv" as const, label: "CSV", Icon: FileType2 }];
  const selected = options.find((option) => option.value === value) || options[0];
  return <div className="relative min-w-32"><span className="mb-2 block text-sm font-semibold text-ink/80">Download type</span><button type="button" className="flex w-full items-center justify-between gap-2 rounded-2xl border border-moss/15 bg-white/85 px-4 py-3 text-sm font-semibold text-ink" onClick={() => setOpen((current) => !current)}><span className="flex items-center gap-2"><selected.Icon size={16} className="text-fern" />{selected.label}</span><ChevronDown size={16} /></button>{open && <div className="absolute right-0 z-[110] mt-2 w-full min-w-32 rounded-2xl border border-moss/10 bg-white p-2 shadow-card">{options.map((option) => <button key={option.value} type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-moss/8" onClick={() => { onChange(option.value); setOpen(false); }}><option.Icon size={16} className="text-fern" />{option.label}</button>)}</div>}</div>;
}

function shiftLabel(assignment: ShiftAssignment | undefined) {
  if (!assignment) return "-";
  return assignment.shiftCode || assignment.shiftName || "-";
}

function companyHeaderFallback(html: string, template: string, name: string, address: string) {
  if (template.includes("{{COMPANY_NAME}}") && template.includes("{{COMPANY_ADDRESS}}")) return html;
  const header = `<div style="margin-bottom:14px;text-align:center"><h2 style="margin:0;font-size:20px">${escapeHtml(name || "Company")}</h2><p style="margin:4px 0 0;color:#53665f;font-size:11px;white-space:pre-line">${escapeHtml(address || "").replace(/\r?\n/g, "<br />")}</p></div>`;
  const bodyTag = html.match(/<body[^>]*>/i)?.[0];
  return bodyTag ? html.replace(bodyTag, `${bodyTag}${header}`) : `${header}${html}`;
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
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

function downloadTextFile(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadXlsx(headers: string[], rows: string[][], filename: string, companyName: string, companyAddress: string) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Report");
  worksheet.addRow([companyName || "Company"]);
  worksheet.mergeCells(1, 1, 1, headers.length);
  worksheet.addRow([companyAddress || ""]);
  worksheet.mergeCells(2, 1, 2, headers.length);
  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.getRow(1).font = { bold: true, size: 14, color: { argb: "FF214E45" } };
  worksheet.getRow(2).font = { italic: true, color: { argb: "FF53665F" } };
  worksheet.getRow(3).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF214E45" } };
  worksheet.views = [{ state: "frozen", ySplit: 3 }];
  worksheet.columns.forEach((column) => { column.width = 16; });
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { user, currency } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState("");
  const [template, setTemplate] = useState(() => loadTemplate(SHIFT_TEMPLATE_STORAGE_KEY, defaultTemplate));
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
  const [punchTemplate, setPunchTemplate] = useState(() => loadTemplate(PUNCH_TEMPLATE_STORAGE_KEY, defaultTemplate));
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
  const [salaryTemplate, setSalaryTemplate] = useState(() => loadTemplate(SALARY_TEMPLATE_STORAGE_KEY, defaultTemplate));
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
    .split("{{MONTH}}").join(new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${month}-01T00:00:00`)))
    .split("{{PRINTED_AT}}").join(printedAt)
    .split("{{TABLE}}").join(tableHtml)
    .split("{{APPROVED_BY}}").join("____________________________"), template, companyName, companyAddress), [companyAddress, companyName, month, printedAt, tableHtml, template]);

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
    .split("{{MONTH}}").join(`${punchFrom || "-"} to ${punchTo || "-"}`)
    .split("{{PRINTED_AT}}").join(punchPrintedAt)
    .split("{{TABLE}}").join(punchTableHtml)
    .split("{{APPROVED_BY}}").join("____________________________"), punchTemplate, companyName, companyAddress), [companyAddress, companyName, punchFrom, punchPrintedAt, punchTableHtml, punchTemplate, punchTo]);

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
    .split("{{MONTH}}").join(new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${salaryMonth}-01T00:00:00`)))
    .split("{{PRINTED_AT}}").join(salaryPrintedAt)
    .split("{{TABLE}}").join(salaryTableHtml)
    .split("{{APPROVED_BY}}").join("____________________________"), salaryTemplate, companyName, companyAddress), [companyAddress, companyName, salaryMonth, salaryPrintedAt, salaryTableHtml, salaryTemplate]);

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
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(pdfReportRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: pdfReportRef.current.clientWidth, width: pdfReportRef.current.clientWidth });
      const pdf = new jsPDF({ orientation: pdfOrientation, unit: "pt", format: "a4" });
      const margin = 24;
      const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
      const sourcePageHeight = Math.max(1, Math.floor(canvas.width * (pageHeight / pageWidth)));
      const pageCanvas = document.createElement("canvas");
      const context = pageCanvas.getContext("2d");
      if (!context) throw new Error("Unable to prepare the PDF preview.");
      for (let sourceY = 0; sourceY < canvas.height; sourceY += sourcePageHeight) {
        const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        context.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        if (sourceY > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, pageWidth, (sliceHeight / canvas.width) * pageWidth);
      }
      pdf.save(`shift-assignment-report-${month}-${pdfOrientation}.pdf`);
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
      else await downloadXlsx(headers, rows, `shift-assignment-report-${month}.xlsx`, companyName, companyAddress);
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
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(punchPdfReportRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: punchPdfReportRef.current.clientWidth, width: punchPdfReportRef.current.clientWidth });
      const pdf = new jsPDF({ orientation: punchPdfOrientation, unit: "pt", format: "a4" });
      const margin = 24;
      const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
      const sourcePageHeight = Math.max(1, Math.floor(canvas.width * (pageHeight / pageWidth)));
      const pageCanvas = document.createElement("canvas");
      const context = pageCanvas.getContext("2d");
      if (!context) throw new Error("Unable to prepare the PDF preview.");
      for (let sourceY = 0; sourceY < canvas.height; sourceY += sourcePageHeight) {
        const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        context.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        if (sourceY > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, pageWidth, (sliceHeight / canvas.width) * pageWidth);
      }
      pdf.save(`employee-punches-report-${punchFrom || "from"}-${punchTo || "to"}-${punchPdfOrientation}.pdf`);
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
      else await downloadXlsx(headers, rows, `employee-punches-report-${punchFrom || "from"}-${punchTo || "to"}.xlsx`, companyName, companyAddress);
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
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(salaryPdfReportRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: salaryPdfReportRef.current.clientWidth, width: salaryPdfReportRef.current.clientWidth });
      const pdf = new jsPDF({ orientation: salaryPdfOrientation, unit: "pt", format: "a4" });
      const margin = 24;
      const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
      const sourcePageHeight = Math.max(1, Math.floor(canvas.width * (pageHeight / pageWidth)));
      const pageCanvas = document.createElement("canvas");
      const context = pageCanvas.getContext("2d");
      if (!context) throw new Error("Unable to prepare the salary report PDF preview.");
      for (let sourceY = 0; sourceY < canvas.height; sourceY += sourcePageHeight) {
        const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        context.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        if (sourceY > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, pageWidth, (sliceHeight / canvas.width) * pageWidth);
      }
      pdf.save(`salary-report-${salaryMonth}-${salaryPdfOrientation}.pdf`);
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
      else await downloadXlsx(salaryReportData.headers, salaryReportData.rows, `salary-report-${salaryMonth}.xlsx`, companyName, companyAddress);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : getErrorMessage(apiError));
    } finally {
      setDownloadingSalaries(false);
    }
  }

  return <div className="space-y-6">
    <Card><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Reports</p><h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Reports</h2><p className="mt-2 text-sm text-ink/60">Choose a report to open its filters, preview, and download options.</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-ember text-ink shadow-glow"><FileBarChart size={22} /></div></div></Card>
    <Card className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-card" onClick={() => setShiftReportOpen(true)}><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Attendance Setup</p><h3 className="mt-2 font-display text-2xl font-extrabold text-ink">Shift Assignment</h3><p className="mt-2 text-sm text-ink/60">View role-scoped employee schedules by month and download the formatted report.</p></div><Button type="button" onClick={() => setShiftReportOpen(true)}>Open report</Button></div></Card>
    <Card className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-card" onClick={() => setPunchReportOpen(true)}><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Attendance</p><h3 className="mt-2 font-display text-2xl font-extrabold text-ink">Employee Punches</h3><p className="mt-2 text-sm text-ink/60">Download employee IN/OUT punch details with date, time, branch, and department filters.</p></div><Button type="button" onClick={() => setPunchReportOpen(true)}>Open report</Button></div></Card>
    <CalendarOffReport />
    {hasRoleAccess(user, HR_ROLES) && <Card className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-card" onClick={openSalaryReport}><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Payroll</p><h3 className="mt-2 font-display text-2xl font-extrabold text-ink">Salary Report</h3><p className="mt-2 text-sm text-ink/60">Review employee CTC, earnings, employer contributions, deductions, and estimated take-home.</p></div><Button type="button" onClick={(event) => { event.stopPropagation(); openSalaryReport(); }}>Open report</Button></div></Card>}
    <Modal title="Shift Assignment Report" description="Filters, full HTML template, live preview, and A4 PDF download" open={shiftReportOpen} onClose={() => setShiftReportOpen(false)}>
      <div className="space-y-6">
        <Card><div className="mb-5 flex items-center justify-between"><div><h3 className="font-display text-xl font-extrabold">Shift Assignment</h3><p className="mt-1 text-sm text-ink/60">Filters apply only to the employees and assignments allowed for your role.</p></div>{loadingAssignments && <RefreshCw className="animate-spin text-fern" size={18} />}</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Input label="Report month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><Select label="Branch" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}><option value="">All branches</option>{branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</Select><Select label="Department" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}><option value="">All departments</option>{departments.filter((department) => employees.some((employee) => employee.departmentId === department.id)).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select><Select label="Designation" value={designationFilter} onChange={(event) => setDesignationFilter(event.target.value)}><option value="">All designations</option>{designationOptions.map((designation) => <option key={designation} value={designation}>{designation}</option>)}</Select><Select label="Shift" value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)}><option value="">All shifts</option>{shiftOptions.map((shift) => <option key={shift} value={shift}>{shift}</option>)}</Select><EmployeeAutocomplete label="Employee code / name" value={selectedEmployeeCode} employees={employees} onChange={setSelectedEmployeeCode} placeholder="Search code or name" /></div><p className="mt-4 text-xs font-semibold text-ink/50">Showing {filteredEmployees.length} of {employees.length} role-scoped employee(s).</p></Card>
        <Card><div className="flex flex-col gap-3 border-b border-moss/10 pb-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-display text-xl font-extrabold">Full HTML template</h3><p className="mt-1 text-sm text-ink/60">Edit the complete HTML/CSS. Placeholders: &#123;&#123;COMPANY_NAME&#125;&#125;, &#123;&#123;COMPANY_ADDRESS&#125;&#125;, &#123;&#123;REPORT_TITLE&#125;&#125;, &#123;&#123;MONTH&#125;&#125;, &#123;&#123;PRINTED_AT&#125;&#125;, &#123;&#123;TABLE&#125;&#125;, &#123;&#123;APPROVED_BY&#125;&#125;.</p></div><div className="flex flex-wrap items-end gap-3"><OrientationDropdown value={pdfOrientation} onChange={setPdfOrientation} /><DownloadFormatDropdown value={shiftDownloadFormat} onChange={setShiftDownloadFormat} /><Button type="button" variant="secondary" onClick={() => saveTemplate(SHIFT_TEMPLATE_STORAGE_KEY, template, "Shift assignment")}><Save size={17} />Save template</Button><Button type="button" variant="ghost" onClick={() => resetTemplate(SHIFT_TEMPLATE_STORAGE_KEY, setTemplate, "Shift assignment")}><RotateCcw size={17} />Reset template</Button><Button onClick={downloadShiftReport} disabled={downloading || loading || loadingAssignments}><Download size={17} />{downloading ? "Creating PDF..." : `Download ${shiftDownloadFormat.toUpperCase()}`}</Button></div></div><textarea className="mt-5 min-h-80 w-full rounded-2xl border border-moss/15 bg-ink/[0.03] p-4 font-mono text-xs leading-5 text-ink outline-none focus:border-fern focus:ring-4 focus:ring-fern/10" value={template} onChange={(event) => setTemplate(event.target.value)} aria-label="Full report HTML template" />{templateMessage && <p className="mt-3 text-sm font-semibold text-fern">{templateMessage}</p>}</Card>
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <Card><div className="mb-4 flex items-center justify-between"><div><h3 className="font-display text-xl font-extrabold">Live preview</h3><p className="mt-1 text-sm text-ink/60">This exact HTML preview is converted to PDF.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{filteredEmployees.length} employee(s)</span></div><div ref={reportRef} className="overflow-x-auto rounded-2xl border border-moss/10 bg-white p-2" dangerouslySetInnerHTML={{ __html: renderedHtml }} /></Card>
        <div ref={pdfReportRef} aria-hidden="true" className="pointer-events-none absolute -left-[10000px] top-0 bg-white" style={{ width: pdfOrientation === "landscape" ? "1123px" : "794px" }} dangerouslySetInnerHTML={{ __html: renderedHtml }} />
      </div>
    </Modal>
    <Modal title="Employee Punches Report" description="Role-scoped punch details, full HTML template, live preview, and A4 PDF download" open={punchReportOpen} onClose={() => setPunchReportOpen(false)}>
      <div className="space-y-6">
        <Card><div className="mb-5 flex items-center justify-between"><div><h3 className="font-display text-xl font-extrabold">Employee Punches</h3><p className="mt-1 text-sm text-ink/60">Only punch records for employees allowed by your role are shown.</p></div>{loadingPunches && <RefreshCw className="animate-spin text-fern" size={18} />}</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Input label="From date" type="date" value={punchFrom} onChange={(event) => setPunchFrom(event.target.value)} /><Input label="To date" type="date" min={punchFrom} value={punchTo} onChange={(event) => setPunchTo(event.target.value)} /><Select label="Branch" value={punchBranchFilter} onChange={(event) => setPunchBranchFilter(event.target.value)}><option value="">All branches</option>{branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</Select><Select label="Department" value={punchDepartmentFilter} onChange={(event) => setPunchDepartmentFilter(event.target.value)}><option value="">All departments</option>{departments.filter((department) => employees.some((employee) => employee.departmentId === department.id)).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select><Select label="Designation" value={punchDesignationFilter} onChange={(event) => setPunchDesignationFilter(event.target.value)}><option value="">All designations</option>{designationOptions.map((designation) => <option key={designation} value={designation}>{designation}</option>)}</Select><EmployeeAutocomplete label="Employee code / name" value={selectedPunchEmployeeCode} employees={employees} onChange={setSelectedPunchEmployeeCode} placeholder="Search code or name" /></div><p className="mt-4 text-xs font-semibold text-ink/50">Showing {filteredPunchRows.length} punch record(s).</p></Card>
        <Card><div className="flex flex-col gap-3 border-b border-moss/10 pb-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-display text-xl font-extrabold">Full HTML template</h3><p className="mt-1 text-sm text-ink/60">Edit all HTML/CSS styles. Use &#123;&#123;COMPANY_NAME&#125;&#125;, &#123;&#123;COMPANY_ADDRESS&#125;&#125;, &#123;&#123;REPORT_TITLE&#125;&#125;, &#123;&#123;MONTH&#125;&#125;, &#123;&#123;PRINTED_AT&#125;&#125;, &#123;&#123;TABLE&#125;&#125;, and &#123;&#123;APPROVED_BY&#125;&#125;.</p></div><div className="flex flex-wrap items-end gap-3"><OrientationDropdown value={punchPdfOrientation} onChange={setPunchPdfOrientation} /><DownloadFormatDropdown value={punchDownloadFormat} onChange={setPunchDownloadFormat} /><Button type="button" variant="secondary" onClick={() => saveTemplate(PUNCH_TEMPLATE_STORAGE_KEY, punchTemplate, "Employee punches")}><Save size={17} />Save template</Button><Button type="button" variant="ghost" onClick={() => resetTemplate(PUNCH_TEMPLATE_STORAGE_KEY, setPunchTemplate, "Employee punches")}><RotateCcw size={17} />Reset template</Button><Button onClick={downloadPunchReport} disabled={downloadingPunches || loading || loadingPunches}><Download size={17} />{downloadingPunches ? "Creating PDF..." : `Download ${punchDownloadFormat.toUpperCase()}`}</Button></div></div><textarea className="mt-5 min-h-80 w-full rounded-2xl border border-moss/15 bg-ink/[0.03] p-4 font-mono text-xs leading-5 text-ink outline-none focus:border-fern focus:ring-4 focus:ring-fern/10" value={punchTemplate} onChange={(event) => setPunchTemplate(event.target.value)} aria-label="Full employee punches HTML template" />{templateMessage && <p className="mt-3 text-sm font-semibold text-fern">{templateMessage}</p>}</Card>
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <Card><div className="mb-4 flex items-center justify-between"><div><h3 className="font-display text-xl font-extrabold">Live preview</h3><p className="mt-1 text-sm text-ink/60">This exact HTML preview is converted to PDF.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{filteredPunchRows.length} punch record(s)</span></div><div className="overflow-x-auto rounded-2xl border border-moss/10 bg-white p-2" dangerouslySetInnerHTML={{ __html: renderedPunchHtml }} /></Card>
        <div ref={punchPdfReportRef} aria-hidden="true" className="pointer-events-none absolute -left-[10000px] top-0 bg-white" style={{ width: punchPdfOrientation === "landscape" ? "1123px" : "794px" }} dangerouslySetInnerHTML={{ __html: renderedPunchHtml }} />
      </div>
    </Modal>
    <Modal title="Salary Report" description="Current employee salary structures, full HTML template, live preview, and A4 PDF download" open={salaryReportOpen} onClose={() => setSalaryReportOpen(false)}>
      <div className="space-y-6">
        <Card><div className="mb-5 flex items-center justify-between"><div><h3 className="font-display text-xl font-extrabold">Salary breakup</h3><p className="mt-1 text-sm text-ink/60">Salary figures are based on the current annual CTC structure. Only active employees are included.</p></div>{loadingSalaries && <RefreshCw className="animate-spin text-fern" size={18} />}</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Input label="Report month" type="month" value={salaryMonth} onChange={(event) => setSalaryMonth(event.target.value)} /><Select label="Branch" value={salaryBranchFilter} onChange={(event) => setSalaryBranchFilter(event.target.value)}><option value="">All branches</option>{branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</Select><Select label="Department" value={salaryDepartmentFilter} onChange={(event) => setSalaryDepartmentFilter(event.target.value)}><option value="">All departments</option>{departments.filter((department) => employees.some((employee) => employee.departmentId === department.id)).map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}</Select><Select label="Designation" value={salaryDesignationFilter} onChange={(event) => setSalaryDesignationFilter(event.target.value)}><option value="">All designations</option>{designationOptions.map((designation) => <option key={designation} value={designation}>{designation}</option>)}</Select><EmployeeAutocomplete label="Employee code / name" value={selectedSalaryEmployeeCode} employees={employees} onChange={setSelectedSalaryEmployeeCode} placeholder="Search code or name" /></div><p className="mt-4 text-xs font-semibold text-ink/50">{salaryReportLoaded ? `Showing ${filteredSalaryProfiles.length} of ${salaryProfiles.length} active employee(s).` : loadingSalaries ? "Loading salary structures..." : "Open the report to load salary structures."}</p></Card>
        <Card><div className="flex flex-col gap-3 border-b border-moss/10 pb-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-display text-xl font-extrabold">Full HTML template</h3><p className="mt-1 text-sm text-ink/60">Edit the complete HTML/CSS. Placeholders: &#123;&#123;COMPANY_NAME&#125;&#125;, &#123;&#123;COMPANY_ADDRESS&#125;&#125;, &#123;&#123;REPORT_TITLE&#125;&#125;, &#123;&#123;MONTH&#125;&#125;, &#123;&#123;PRINTED_AT&#125;&#125;, &#123;&#123;TABLE&#125;&#125;, &#123;&#123;APPROVED_BY&#125;&#125;.</p></div><div className="flex flex-wrap items-end gap-3"><OrientationDropdown value={salaryPdfOrientation} onChange={setSalaryPdfOrientation} /><DownloadFormatDropdown value={salaryDownloadFormat} onChange={setSalaryDownloadFormat} /><Button type="button" variant="secondary" onClick={() => saveTemplate(SALARY_TEMPLATE_STORAGE_KEY, salaryTemplate, "Salary")}><Save size={17} />Save template</Button><Button type="button" variant="ghost" onClick={() => resetTemplate(SALARY_TEMPLATE_STORAGE_KEY, setSalaryTemplate, "Salary")}><RotateCcw size={17} />Reset template</Button><Button onClick={downloadSalaryReport} disabled={downloadingSalaries || loading || loadingSalaries || !salaryReportLoaded}><Download size={17} />{downloadingSalaries ? `Creating ${salaryDownloadFormat.toUpperCase()}...` : `Download ${salaryDownloadFormat.toUpperCase()}`}</Button></div></div><textarea className="mt-5 min-h-80 w-full rounded-2xl border border-moss/15 bg-ink/[0.03] p-4 font-mono text-xs leading-5 text-ink outline-none focus:border-fern focus:ring-4 focus:ring-fern/10" value={salaryTemplate} onChange={(event) => setSalaryTemplate(event.target.value)} aria-label="Full salary report HTML template" />{templateMessage && <p className="mt-3 text-sm font-semibold text-fern">{templateMessage}</p>}</Card>
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <Card><div className="mb-4 flex items-center justify-between"><div><h3 className="font-display text-xl font-extrabold">Live preview</h3><p className="mt-1 text-sm text-ink/60">This exact HTML preview is converted to PDF.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{filteredSalaryProfiles.length} employee(s)</span></div><div className="overflow-x-auto rounded-2xl border border-moss/10 bg-white p-2" dangerouslySetInnerHTML={{ __html: renderedSalaryHtml }} /></Card>
        <div ref={salaryPdfReportRef} aria-hidden="true" className="pointer-events-none absolute -left-[10000px] top-0 bg-white" style={{ width: salaryPdfOrientation === "landscape" ? "1123px" : "794px" }} dangerouslySetInnerHTML={{ __html: renderedSalaryHtml }} />
      </div>
    </Modal>
  </div>;
}
