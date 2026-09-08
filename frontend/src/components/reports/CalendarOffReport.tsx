import { useEffect, useMemo, useRef, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { getErrorMessage } from "../../api/client";
import { calendarOffReportApi, employeeApi, settingsApi } from "../../api/payroll";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { EmployeeAutocomplete } from "../ui/EmployeeAutocomplete";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { formatDate } from "../../lib/format";
import type { CalendarOffReportRow, CalendarOffType, Employee } from "../../types";

type DownloadFormat = "pdf" | "xlsx" | "csv";

function currentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return { from: `${year}-${month}-01`, to: `${year}-${month}-${String(lastDay).padStart(2, "0")}` };
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadTextFile(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function reportTitle(type: CalendarOffType) {
  return type === "HOLIDAY" ? "Holiday Report" : "Week Off Report";
}

function typeLabel(type: CalendarOffType) {
  return type === "HOLIDAY" ? "Holiday" : "Week off";
}

export function CalendarOffReport() {
  const initialRange = currentMonthRange();
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [type, setType] = useState<CalendarOffType>("HOLIDAY");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [rows, setRows] = useState<CalendarOffReportRow[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("pdf");
  const [error, setError] = useState("");
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || employees.length > 0) return;
    setLoadingEmployees(true);
    Promise.all([
      employeeApi.search({ status: "ACTIVE", page: 0, size: 1000 }),
      settingsApi.get(),
    ])
      .then(([employeePage, settings]) => {
        setEmployees(employeePage.content);
        setCompanyName(settings.companyName || "");
        setCompanyAddress(settings.address || "");
      })
      .catch((apiError) => setError(getErrorMessage(apiError)))
      .finally(() => setLoadingEmployees(false));
  }, [employees.length, open]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.employeeCode === employeeCode),
    [employeeCode, employees],
  );
  const branchOptions = useMemo(() => Array.from(new Map(
    employees.filter((employee) => employee.branchId && employee.branchName)
      .map((employee) => [employee.branchId as number, employee.branchName as string]),
  )).map(([id, name]) => ({ id, name })).sort((left, right) => left.name.localeCompare(right.name)), [employees]);
  const scopedEmployees = useMemo(() => employees.filter((employee) => (
    (!branchId || employee.branchId === Number(branchId))
    && (!departmentId || employee.departmentId === Number(departmentId))
    && (!designationId || employee.designationId === Number(designationId))
  )), [branchId, departmentId, designationId, employees]);
  const departmentOptions = useMemo(() => Array.from(new Map(
    scopedEmployees.map((employee) => [employee.departmentId, employee.departmentName]),
  )).map(([id, name]) => ({ id, name })).sort((left, right) => left.name.localeCompare(right.name)), [scopedEmployees]);
  const designationOptions = useMemo(() => Array.from(new Map(
    scopedEmployees.map((employee) => [employee.designationId, employee.designationTitle]),
  )).map(([id, name]) => ({ id, name })).sort((left, right) => left.name.localeCompare(right.name)), [scopedEmployees]);

  useEffect(() => {
    if (!open || !from || !to || to < from) {
      if (open && to < from) setRows([]);
      return;
    }
    let cancelled = false;
    setLoadingRows(true);
    setError("");
    calendarOffReportApi.list({
      type,
      from,
      to,
      branchId: branchId ? Number(branchId) : undefined,
      departmentId: departmentId ? Number(departmentId) : undefined,
      designationId: designationId ? Number(designationId) : undefined,
      employeeId: selectedEmployee?.id,
    })
      .then((items) => { if (!cancelled) setRows(items); })
      .catch((apiError) => { if (!cancelled) { setRows([]); setError(getErrorMessage(apiError)); } })
      .finally(() => { if (!cancelled) setLoadingRows(false); });
    return () => { cancelled = true; };
  }, [branchId, departmentId, designationId, from, open, selectedEmployee?.id, to, type]);

  const headers = ["Date", "Day", "Employee Code", "Employee", "Branch", "Department", "Designation", type === "HOLIDAY" ? "Holiday" : "Calendar Off", "Applied Via"];
  const exportRows = rows.map((row) => [
    row.date,
    row.day,
    row.employeeCode,
    row.employeeName,
    row.branchName || "-",
    row.departmentName,
    row.designationTitle,
    row.calendarOff,
    row.appliedVia,
  ]);

  async function downloadXlsx() {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Calendar Off");
    worksheet.addRow([companyName || "Company"]);
    worksheet.mergeCells(1, 1, 1, headers.length);
    worksheet.addRow([companyAddress || ""]);
    worksheet.mergeCells(2, 1, 2, headers.length);
    worksheet.addRow([reportTitle(type)]);
    worksheet.mergeCells(3, 1, 3, headers.length);
    worksheet.addRow([`${from} to ${to}`]);
    worksheet.mergeCells(4, 1, 4, headers.length);
    worksheet.addRow(headers);
    exportRows.forEach((row) => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true, size: 14, color: { argb: "FF214E45" } };
    worksheet.getRow(3).font = { bold: true, size: 12, color: { argb: "FF214E45" } };
    worksheet.getRow(5).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF214E45" } };
    worksheet.views = [{ state: "frozen", ySplit: 5 }];
    worksheet.columns.forEach((column) => { column.width = 18; });
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `calendar-off-report-${type.toLowerCase()}-${from}-${to}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPdf() {
    if (!pdfRef.current) return;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
    const canvas = await html2canvas(pdfRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: pdfRef.current.clientWidth,
      width: pdfRef.current.clientWidth,
    });
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const margin = 24;
    const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
    const sourcePageHeight = Math.max(1, Math.floor(canvas.width * (pageHeight / pageWidth)));
    const pageCanvas = document.createElement("canvas");
    const context = pageCanvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare the calendar off report PDF.");
    for (let sourceY = 0; sourceY < canvas.height; sourceY += sourcePageHeight) {
      const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      context.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
      context.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      if (sourceY > 0) pdf.addPage();
      pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, pageWidth, (sliceHeight / canvas.width) * pageWidth);
    }
    pdf.save(`calendar-off-report-${type.toLowerCase()}-${from}-${to}.pdf`);
  }

  async function downloadReport() {
    setDownloading(true);
    setError("");
    try {
      if (downloadFormat === "pdf") {
        await downloadPdf();
      } else if (downloadFormat === "xlsx") {
        await downloadXlsx();
      } else {
        const content = [[companyName || "Company"], [companyAddress || ""], [reportTitle(type)], [`${from} to ${to}`], [], headers, ...exportRows]
          .map((row) => row.map(csvCell).join(",")).join("\r\n");
        downloadTextFile(content, `calendar-off-report-${type.toLowerCase()}-${from}-${to}.csv`);
      }
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : getErrorMessage(apiError));
    } finally {
      setDownloading(false);
    }
  }

  function changeBranch(value: string) {
    setBranchId(value);
    setDepartmentId("");
    setDesignationId("");
    setEmployeeCode("");
  }

  function changeDepartment(value: string) {
    setDepartmentId(value);
    setDesignationId("");
    setEmployeeCode("");
  }

  function changeDesignation(value: string) {
    setDesignationId(value);
    setEmployeeCode("");
  }

  const reportTable = <table className="w-full min-w-[1040px] text-left text-sm">
    <thead className="bg-moss/5 text-xs font-extrabold uppercase tracking-[0.12em] text-ink/55">
      <tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
    </thead>
    <tbody className="divide-y divide-moss/10">
      {rows.map((row) => <tr key={`${row.employeeId}-${row.date}`} className="bg-white/45">
        <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">{formatDate(row.date)}</td>
        <td className="px-4 py-3 text-ink/70">{row.day}</td>
        <td className="px-4 py-3 font-semibold text-ink">{row.employeeCode}</td>
        <td className="px-4 py-3 font-semibold text-ink">{row.employeeName}</td>
        <td className="px-4 py-3 text-ink/70">{row.branchName || "-"}</td>
        <td className="px-4 py-3 text-ink/70">{row.departmentName}</td>
        <td className="px-4 py-3 text-ink/70">{row.designationTitle}</td>
        <td className="px-4 py-3 font-semibold text-ink">{row.calendarOff}</td>
        <td className="px-4 py-3"><span className="rounded-full bg-fern/10 px-2.5 py-1 text-xs font-bold text-fern">{row.appliedVia}</span></td>
      </tr>)}
      {!loadingRows && rows.length === 0 && <tr><td colSpan={headers.length} className="px-5 py-10 text-center text-sm font-semibold text-ink/45">No {typeLabel(type).toLowerCase()} calendar off days found for the selected filters.</td></tr>}
    </tbody>
  </table>;

  return <>
    <Card className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-card" onClick={() => setOpen(true)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Attendance</p>
          <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">Calendar Off Report</h3>
          <p className="mt-2 text-sm text-ink/60">Choose Holiday or Week Off, then review the employee-wise calendar days resolved from the applicable rules.</p>
        </div>
        <Button type="button" onClick={(event) => { event.stopPropagation(); setOpen(true); }}>Open report</Button>
      </div>
    </Card>

    <Modal title="Calendar Off Report" description="Employee-wise holiday and week-off days, resolved from the applicable branch, department, designation, and employee rules." open={open} onClose={() => setOpen(false)}>
      <div className="space-y-6">
        <Card>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="font-display text-xl font-extrabold text-ink">Calendar off filters</h3>
              <p className="mt-1 text-sm text-ink/60">The available department, designation, and employee choices update from the selections above them.</p>
            </div>
            {(loadingRows || loadingEmployees) && <RefreshCw className="animate-spin text-fern" size={18} />}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Select label="Calendar off type" value={type} onChange={(event) => setType(event.target.value as CalendarOffType)}>
              <option value="HOLIDAY">Holiday</option>
              <option value="WEEK_OFF">Week Off</option>
            </Select>
            <Input label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input label="To date" type="date" min={from} value={to} onChange={(event) => setTo(event.target.value)} />
            <Select label="Branch" value={branchId} onChange={(event) => changeBranch(event.target.value)}>
              <option value="">All branches</option>
              {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </Select>
            <Select label="Department" value={departmentId} onChange={(event) => changeDepartment(event.target.value)}>
              <option value="">All departments</option>
              {departmentOptions.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </Select>
            <Select label="Designation" value={designationId} onChange={(event) => changeDesignation(event.target.value)}>
              <option value="">All designations</option>
              {designationOptions.map((designation) => <option key={designation.id} value={designation.id}>{designation.name}</option>)}
            </Select>
            <EmployeeAutocomplete label="Employee code / name" value={employeeCode} employees={scopedEmployees} onChange={setEmployeeCode} placeholder="All employees" />
          </div>
          <p className="mt-4 text-xs font-semibold text-ink/50">{type === "HOLIDAY" ? "Holiday rows are matched to the employee's branch, department, and designation." : "Week off priority: Employee date → Employee weekly → Group weekly. Group exclude dates affect only group weekly rules."}</p>
        </Card>

        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-moss/10 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div><h3 className="font-display text-xl font-extrabold text-ink">{reportTitle(type)}</h3><p className="mt-1 text-sm text-ink/60">{from} to {to} · {rows.length} employee-day{rows.length === 1 ? "" : "s"}</p></div>
            <div className="flex flex-wrap items-end gap-3">
              <Select label="Download as" value={downloadFormat} onChange={(event) => setDownloadFormat(event.target.value as DownloadFormat)} className="min-w-28" aria-label="Download format">
                <option value="pdf">PDF</option><option value="xlsx">XLSX</option><option value="csv">CSV</option>
              </Select>
              <Button type="button" onClick={downloadReport} disabled={downloading || loadingRows || !from || !to || to < from}><Download size={17} />{downloading ? "Creating..." : `Download ${downloadFormat.toUpperCase()}`}</Button>
            </div>
          </div>
          <div className="overflow-x-auto">{reportTable}</div>
        </Card>

        <div ref={pdfRef} aria-hidden="true" className="pointer-events-none absolute -left-[10000px] top-0 w-[1123px] bg-white p-8 text-ink">
          <div className="mb-6 text-center"><h2 className="text-xl font-bold">{companyName || "Company"}</h2>{companyAddress && <p className="mt-1 whitespace-pre-line text-xs text-ink/70">{companyAddress}</p>}</div>
          <h1 className="mb-1 text-2xl font-bold">{reportTitle(type)}</h1><p className="mb-5 text-sm text-ink/70">Period: {from} to {to}</p>
          <div className="overflow-hidden border border-moss/10">{reportTable}</div>
        </div>
      </div>
    </Modal>
  </>;
}
