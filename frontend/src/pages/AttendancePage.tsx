import { useEffect, useRef, useState } from "react";
import { Download, Plus, RefreshCw, Save, Trash2, Upload, Wifi } from "lucide-react";
import { attendanceApi, employeeApi, shiftAssignmentApi } from "../api/payroll";
import { getErrorMessage } from "../api/client";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import type { AttendanceSettings, Employee } from "../types";

const today = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  const localValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return !Number.isNaN(date.getTime()) && localValue === value;
}

function isTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

function timeOnly(value: string) {
  return value.length > 5 ? value.slice(0, 5) : value;
}

function csvColumns(value: string) {
  const columns: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (quoted && value[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      columns.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  columns.push(current.trim());
  return columns;
}

function excelCellText(value: unknown, column: number) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    if (column === 2) return value.toISOString().slice(0, 10);
    if (column === 3) return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
  }
  if (typeof value === "object" && value && "result" in value) return String((value as { result: unknown }).result ?? "").trim();
  return String(value).trim();
}

interface ManualAttendanceRow {
  id: number;
  employeeId: number;
  date: string;
  clockIn: string;
  clockOutDate: string;
  clockOut: string;
}

interface UploadAttendanceRow {
  id: number;
  line: number;
  employeeCode: string;
  employeeId?: number;
  employeeName?: string;
  punchDate: string;
  punchTime: string;
  type: string;
  recordDate?: string;
  errors: string[];
}

interface OpenUploadPunch {
  employeeId: number;
  date: string;
  time: string;
}

export function AttendancePage() {
  const [settings, setSettings] = useState<AttendanceSettings>({ attendanceMode: "MANUAL", biometricEnabled: false });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [manualRows, setManualRows] = useState<ManualAttendanceRow[]>([]);
  const [manualPanelOpen, setManualPanelOpen] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [file, setFile] = useState<File>();
  const [uploadRows, setUploadRows] = useState<UploadAttendanceRow[]>([]);
  const [validatingUpload, setValidatingUpload] = useState(false);
  const [savingUpload, setSavingUpload] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const nextRowId = useRef(1);

  useEffect(() => {
    attendanceApi.getSettings().then(setSettings).catch((apiError) => setError(getErrorMessage(apiError)));
    employeeApi.search({ status: "ACTIVE", page: 0, size: 1000 }).then((response) => setEmployees(response.content)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (settings.attendanceMode !== "PUNCHES" || !settings.biometricEnabled) return;
    const currentDate = today();
    const timer = window.setInterval(() => attendanceApi.list(currentDate, currentDate).catch(() => undefined), 10000);
    return () => window.clearInterval(timer);
  }, [settings.attendanceMode, settings.biometricEnabled]);

  function createManualRow(): ManualAttendanceRow {
    const date = today();
    return { id: nextRowId.current++, employeeId: 0, date, clockIn: "", clockOutDate: date, clockOut: "" };
  }

  function openManualPanel() {
    setManualRows([createManualRow()]);
    setError("");
    setMessage("");
    setManualPanelOpen(true);
  }

  function closeManualPanel() {
    if (savingManual) return;
    setManualPanelOpen(false);
    setManualRows([]);
  }

  function appendManualRow() {
    setManualRows((current) => [...current, createManualRow()]);
  }

  function removeManualRow(id: number) {
    setManualRows((current) => current.filter((row) => row.id !== id));
  }

  function updateManualRow(id: number, changes: Partial<Omit<ManualAttendanceRow, "id">>) {
    const existing = manualRows.find((row) => row.id === id);
    if (!existing) return;
    const scheduleChanged = changes.employeeId !== undefined || changes.date !== undefined;
    const next = { ...existing, ...changes, ...(scheduleChanged ? { clockIn: "", clockOutDate: changes.date ?? existing.date, clockOut: "" } : {}) };
    setManualRows((current) => current.map((row) => row.id === id ? { ...row, ...next } : row));

    if (scheduleChanged && next.employeeId && next.date) {
      Promise.all([
        attendanceApi.list(next.date, next.date).catch(() => []),
        shiftAssignmentApi.search({ employeeId: next.employeeId, startDate: next.date, endDate: next.date }).catch(() => []),
      ])
        .then(([attendanceRecords, shifts]) => {
          const savedAttendance = attendanceRecords.find((record) => record.employeeId === next.employeeId);
          const shiftStart = shifts[0]?.startTime?.slice(0, 5) || "";
          const clockIn = savedAttendance?.clockIn?.slice(0, 5) || shiftStart;
          const clockOutDate = savedAttendance?.clockOutDate || savedAttendance?.date || next.date;
          const clockOut = savedAttendance?.clockOut?.slice(0, 5) || "";
          setManualRows((current) => current.map((row) => row.id === id && row.employeeId === next.employeeId && row.date === next.date ? { ...row, clockIn, clockOutDate, clockOut } : row));
        })
        .catch(() => undefined);
    }
  }

  async function saveManualRows() {
    if (!manualRows.length) return setError("Add at least one employee.");
    const invalidRow = manualRows.find((row) => !row.employeeId || !row.date || !row.clockIn || (row.clockOut && !row.clockOutDate));
    if (invalidRow) return setError("Employee, IN date, and IN time are required for every row.");
    if (manualRows.some((row) => row.date > today())) return setError("Future attendance is not allowed.");
    if (manualRows.some((row) => row.clockOutDate > today())) return setError("Future OUT date is not allowed.");
    if (manualRows.some((row) => row.clockOut && (row.clockOutDate < row.date || (row.clockOutDate === row.date && row.clockOut <= row.clockIn)))) return setError("OUT must be after IN. For night shifts, choose the next OUT date.");

    setSavingManual(true);
    setError("");
    try {
      await Promise.all(manualRows.map((row) => attendanceApi.save({
        employeeId: row.employeeId,
        date: row.date,
        clockInDate: row.date,
        clockOutDate: row.clockOut ? row.clockOutDate : undefined,
        clockIn: row.clockIn,
        clockOut: row.clockOut || undefined,
        source: "MANUAL",
      })));
      setMessage(`Attendance saved for ${manualRows.length} employee(s).`);
      setManualPanelOpen(false);
      setManualRows([]);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : getErrorMessage(apiError));
    } finally {
      setSavingManual(false);
    }
  }

  async function downloadTemplate() {
    if (!employees.length) return setError("No employees are available in your role scope.");
    setError("");
    try {
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Attendance Upload");
      const allowed = workbook.addWorksheet("Allowed Employees");
      const templateRows = Math.max(100, employees.length);
      sheet.columns = [
        { header: "Employee Code", key: "employeeCode", width: 22 },
        { header: "Punch Date", key: "punchDate", width: 16 },
        { header: "Punch Time", key: "punchTime", width: 16 },
        { header: "Type", key: "type", width: 12 },
      ];
      for (let index = 0; index < templateRows; index += 1) sheet.addRow({ employeeCode: "", punchDate: "", punchTime: "", type: "" });
      allowed.columns = [
        { header: "Employee Code", key: "employeeCode", width: 22 },
        { header: "Employee Name", key: "employeeName", width: 30 },
        { header: "Branch", key: "branch", width: 24 },
      ];
      employees.forEach((employee) => allowed.addRow({ employeeCode: employee.employeeCode, employeeName: employee.fullName, branch: employee.branchName || "" }));
      workbook.definedNames.add(`'Allowed Employees'!$A$2:$A$${employees.length + 1}`, "AllowedEmployeeCodes");
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF214E45" } };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      for (let row = 2; row <= templateRows + 1; row += 1) {
        sheet.getCell(row, 1).dataValidation = { type: "list", allowBlank: false, formulae: ["=AllowedEmployeeCodes"], showErrorMessage: true, errorStyle: "stop", errorTitle: "Invalid employee", error: "Choose an employee from the dropdown." };
        sheet.getCell(row, 2).numFmt = "yyyy-mm-dd";
        sheet.getCell(row, 3).numFmt = "hh:mm";
        sheet.getCell(row, 4).dataValidation = { type: "list", allowBlank: false, formulae: ['"IN,OUT"'], showErrorMessage: true, errorStyle: "stop", errorTitle: "Invalid punch type", error: "Choose IN or OUT." };
      }
      allowed.state = "hidden";
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "attendance-punch-template.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  async function readUploadRows(uploadFile: File) {
    if (uploadFile.name.toLowerCase().endsWith(".xlsx")) {
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await uploadFile.arrayBuffer());
      const sheet = workbook.worksheets[0];
      const rows: string[][] = [];
      sheet?.eachRow((row) => {
        const values = [1, 2, 3, 4].map((column) => excelCellText(row.getCell(column).value, column));
        if (values.some((value) => value)) rows.push(values);
      });
      return rows.slice(1);
    }
    const text = (await uploadFile.text()).replace(/^\uFEFF/, "").trim();
    if (!text) return [];
    return text.split(/\r?\n/).slice(1).filter((row) => row.trim()).map(csvColumns);
  }

  async function uploadPunches() {
    if (!file) return setError("Choose a CSV or XLSX file first.");
    setValidatingUpload(true);
    setUploadRows([]);
    setError("");
    setMessage("");
    try {
      const sourceRows = await readUploadRows(file);
      if (!sourceRows.length) return setError("The upload file has no data rows.");
      const allowedEmployees = new Map(employees.map((employee) => [employee.employeeCode.trim().toUpperCase(), employee]));
      const preview: UploadAttendanceRow[] = [];
      for (let index = 0; index < sourceRows.length; index += 1) {
        const [rawCode = "", rawDate = "", rawTime = "", rawType = ""] = sourceRows[index];
        const employeeCode = rawCode.trim();
        const punchDate = rawDate.trim();
        const punchTime = timeOnly(rawTime.trim());
        const type = rawType.trim().toUpperCase();
        const row: UploadAttendanceRow = { id: index + 1, line: index + 2, employeeCode, punchDate, punchTime, type, errors: [] };
        const employee = allowedEmployees.get(employeeCode.toUpperCase());
        if (sourceRows[index].length !== 4) row.errors.push("Expected Employee Code, Punch Date, Punch Time, Type columns.");
        if (!employee) row.errors.push("Employee code is not available in your role scope.");
        else {
          row.employeeId = employee.id;
          row.employeeName = employee.fullName;
        }
        if (!punchDate || !isDate(punchDate)) row.errors.push("Punch date must be a valid YYYY-MM-DD date.");
        else if (punchDate > today()) row.errors.push("Future punch dates are not allowed.");
        if (!punchTime || !isTime(punchTime)) row.errors.push("Punch time must be HH:mm.");
        if (type !== "IN" && type !== "OUT") row.errors.push("Type must be IN or OUT.");

        preview.push(row);
      }

      const validRows = preview.filter((row) => !row.errors.length && row.employeeId);
      if (validRows.length) {
        const punchDates = validRows.map((row) => row.punchDate).sort();
        const records = await attendanceApi.list(shiftDate(punchDates[0], -7), punchDates[punchDates.length - 1]);
        const uploadedInKeys = new Set<string>();
        const openPunches: OpenUploadPunch[] = records
          .filter((record) => record.clockIn && !record.clockOut)
          .map((record) => ({
            employeeId: record.employeeId,
            date: record.clockInDate || record.date,
            time: timeOnly(record.clockIn || ""),
          }));

        for (const row of validRows.filter((candidate) => candidate.type === "IN")) {
          const key = `${row.employeeId}:${row.punchDate}`;
          const existing = records.find((record) => record.employeeId === row.employeeId && record.date === row.punchDate);
          if (existing?.clockIn) row.errors.push("IN punch already exists for this date.");
          else if (uploadedInKeys.has(key)) row.errors.push("IN punch already exists in this upload for this date.");
          else {
            uploadedInKeys.add(key);
            openPunches.push({ employeeId: row.employeeId!, date: row.punchDate, time: row.punchTime });
          }
        }

        for (const row of validRows.filter((candidate) => candidate.type === "OUT")) {
          const matchingPunches = openPunches
            .map((punch, index) => ({ punch, index }))
            .filter(({ punch }) => punch.employeeId === row.employeeId
              && (punch.date < row.punchDate || (punch.date === row.punchDate && row.punchTime > punch.time)))
            .sort(({ punch: left }, { punch: right }) => right.date.localeCompare(left.date) || right.time.localeCompare(left.time));
          const match = matchingPunches[0];

          if (match) {
            row.recordDate = match.punch.date;
            openPunches.splice(match.index, 1);
          } else {
            const sameDayIn = openPunches.some((punch) => punch.employeeId === row.employeeId && punch.date === row.punchDate);
            row.errors.push(sameDayIn ? "OUT time must be after IN time." : "No open IN punch was found for this employee.");
          }
        }
      }

      setUploadRows(preview);
      if (!preview.some((row) => row.errors.length)) setMessage(`${preview.length} row(s) validated. Review and save the upload.`);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setValidatingUpload(false);
    }
  }

  async function saveUploadedPunches() {
    if (!uploadRows.length) return setError("Validate an upload file first.");
    if (uploadRows.some((row) => row.errors.length)) return setError("Fix all upload errors before saving.");
    setSavingUpload(true);
    setError("");
    try {
      const inRows = uploadRows.filter((row) => row.type === "IN");
      const outRows = uploadRows.filter((row) => row.type === "OUT");
      for (const row of inRows) {
        if (!row.employeeId) throw new Error(`Employee is missing on line ${row.line}.`);
        await attendanceApi.save({
          employeeId: row.employeeId,
          date: row.punchDate,
          clockInDate: row.punchDate,
          clockIn: row.punchTime,
          source: "PUNCH",
        });
      }
      for (const row of outRows) {
        if (!row.employeeId) throw new Error(`Employee is missing on line ${row.line}.`);
        if (!row.recordDate) throw new Error(`No matching IN punch was found on line ${row.line}.`);
        const records = await attendanceApi.list(row.recordDate, row.recordDate);
        const current = records.find((record) => record.employeeId === row.employeeId && record.date === row.recordDate);
        if (!current?.clockIn || current.clockOut) throw new Error(`No open IN punch was found on line ${row.line}.`);
        await attendanceApi.save({
          employeeId: row.employeeId,
          date: current.date,
          clockInDate: current.clockInDate || current.date,
          clockOutDate: row.punchDate,
          clockIn: current.clockIn,
          clockOut: row.punchTime,
          source: "PUNCH",
        });
      }
      setMessage(`${uploadRows.length} punch row(s) saved successfully.`);
      setUploadRows([]);
      setFile(undefined);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : getErrorMessage(apiError));
    } finally {
      setSavingUpload(false);
    }
  }

  const employeeOptions = [
    { value: "0", label: "Choose employee", searchText: "choose employee" },
    ...employees.map((employee) => ({
      value: String(employee.id),
      label: `${employee.employeeCode} — ${employee.fullName}`,
      searchText: `${employee.employeeCode} ${employee.fullName} ${employee.designationTitle} ${employee.departmentName}`,
    })),
  ];
  const uploadHasErrors = uploadRows.some((row) => row.errors.length > 0);

  return <div className="space-y-6"><Card><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Attendance</p><h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Employee Attendance</h2><p className="mt-2 text-sm text-ink/60">Record manual attendance or import punch data based on your system configuration.</p></div>{settings.attendanceMode === "MANUAL" && <Button onClick={openManualPanel}><Plus size={17} />Add attendance</Button>}</div></Card>
  {settings.attendanceMode === "MANUAL" && <Card><h3 className="font-display text-xl font-extrabold">Manual attendance</h3><p className="mt-1 text-sm text-ink/60">Add multiple employees below and save their attendance together. IN date/time and OUT date/time are separate for night shifts.</p></Card>}
  <Card><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h3 className="font-display text-xl font-extrabold">Punch uploader</h3><p className="mt-1 text-sm text-ink/60">Upload CSV or the XLSX template. Employee dropdown values are limited to your role scope; OUT can be on the next date.</p></div><Button variant="secondary" onClick={downloadTemplate}><Download size={17} />Download template</Button></div><div className="mt-6 flex flex-wrap items-end gap-4"><Input label="Upload CSV / XLSX" type="file" accept=".csv,.xlsx" onChange={e => { setFile(e.target.files?.[0]); setUploadRows([]); setError(""); setMessage(""); }} /><Button onClick={uploadPunches} disabled={validatingUpload || savingUpload}><Upload size={17} />{validatingUpload ? "Validating..." : "Validate upload"}</Button>{settings.biometricEnabled && <span className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"><Wifi size={17} />Sync active <RefreshCw size={15} /></span>}</div></Card>
  {uploadRows.length > 0 && <Card className="overflow-hidden border-2 border-fern/20 p-0"><div className="flex flex-col gap-3 border-b border-moss/10 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-display text-xl font-extrabold">Upload preview</h3><p className="mt-1 text-sm text-ink/60">{uploadHasErrors ? "Fix every error before saving." : "All rows are valid and ready to save."}</p></div><div className="flex gap-3"><Button type="button" variant="secondary" onClick={() => setUploadRows([])} disabled={savingUpload}>Clear</Button><Button type="button" onClick={saveUploadedPunches} disabled={uploadHasErrors || savingUpload}><Save size={17} />{savingUpload ? "Saving..." : "Save upload"}</Button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-moss/5 text-xs font-extrabold uppercase tracking-[0.14em] text-ink/55"><tr><th className="px-5 py-3">Line</th><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Punch</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Error</th></tr></thead><tbody className="divide-y divide-moss/10">{uploadRows.map((row) => <tr key={row.id}><td className="px-5 py-3 font-semibold">{row.line}</td><td className="px-5 py-3"><p className="font-bold">{row.employeeCode || "-"}</p><p className="text-xs text-ink/55">{row.employeeName || "Not allowed"}</p></td><td className="px-5 py-3">{row.punchDate || "-"} {row.punchTime || ""}</td><td className="px-5 py-3 font-bold">{row.type || "-"}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.errors.length ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{row.errors.length ? "Error" : "Ready"}</span></td><td className="px-5 py-3 text-xs font-semibold text-red-700">{row.errors.join(" ") || "-"}</td></tr>)}</tbody></table></div></Card>}
  {manualPanelOpen && settings.attendanceMode === "MANUAL" && <Card className="border-2 border-fern/20"><div className="flex flex-col gap-3 border-b border-moss/10 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-display text-xl font-extrabold">Add attendance</h3><p className="mt-1 text-sm text-ink/60">Set separate dates for IN and OUT when a shift crosses midnight.</p></div><Button type="button" variant="secondary" onClick={appendManualRow}><Plus size={16} />Add employee</Button></div><div className="mt-5 space-y-4">{manualRows.map((row, index) => <div key={row.id} className="rounded-3xl border border-moss/10 bg-white/70 p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold text-ink">Employee {index + 1}</p>{manualRows.length > 1 && <Button type="button" variant="danger" className="px-3" onClick={() => removeManualRow(row.id)}><Trash2 size={15} /></Button>}</div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><SearchableSelect label="Employee" value={String(row.employeeId)} options={employeeOptions} onChange={value => updateManualRow(row.id, { employeeId: Number(value) })} /><Input label="IN date" type="date" max={today()} value={row.date} onChange={e => updateManualRow(row.id, { date: e.target.value })} /><Input label="IN time" type="time" value={row.clockIn} onChange={e => updateManualRow(row.id, { clockIn: e.target.value })} /><Input label="OUT date" type="date" min={row.date} max={today()} disabled={!row.clockIn} value={row.clockOutDate} onChange={e => updateManualRow(row.id, { clockOutDate: e.target.value })} /><Input label="OUT time" type="time" disabled={!row.clockIn} value={row.clockOut} onChange={e => updateManualRow(row.id, { clockOut: e.target.value })} /></div><p className="mt-3 text-xs font-semibold text-fern">{row.employeeId && row.clockIn ? `IN ${row.date} ${row.clockIn}${row.clockOut ? ` · OUT ${row.clockOutDate} ${row.clockOut}` : ""}` : "Select an employee to load the saved punch or shift start time."}</p></div>)}</div><div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-moss/10 pt-4"><Button type="button" variant="secondary" onClick={closeManualPanel} disabled={savingManual}>Cancel</Button><Button type="button" onClick={saveManualRows} disabled={savingManual}><Save size={17} />{savingManual ? "Saving..." : `Save ${manualRows.length} attendance`}</Button></div></Card>}
  {(error || message) && <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</p>}</div>;
}
