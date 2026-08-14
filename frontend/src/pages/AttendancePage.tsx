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

interface ManualAttendanceRow {
  id: number;
  employeeId: number;
  date: string;
  clockIn: string;
  clockOut: string;
}

export function AttendancePage() {
  const [settings, setSettings] = useState<AttendanceSettings>({ attendanceMode: "MANUAL", biometricEnabled: false });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [manualRows, setManualRows] = useState<ManualAttendanceRow[]>([]);
  const [manualPanelOpen, setManualPanelOpen] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [file, setFile] = useState<File>();
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
    return { id: nextRowId.current++, employeeId: 0, date: today(), clockIn: "", clockOut: "" };
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
    const next = { ...existing, ...changes, ...(scheduleChanged ? { clockIn: "", clockOut: "" } : {}) };
    setManualRows((current) => current.map((row) => row.id === id ? { ...row, ...next } : row));

    if (scheduleChanged && next.employeeId && next.date) {
      shiftAssignmentApi.search({ employeeId: next.employeeId, startDate: next.date, endDate: next.date })
        .then((rows) => {
          const shiftStart = rows[0]?.startTime?.slice(0, 5) || "";
          setManualRows((current) => current.map((row) => row.id === id && row.employeeId === next.employeeId && row.date === next.date ? { ...row, clockIn: shiftStart } : row));
        })
        .catch(() => undefined);
    }
  }

  async function saveManualRows() {
    if (!manualRows.length) return setError("Add at least one employee.");
    const invalidRow = manualRows.find((row) => !row.employeeId || !row.date || !row.clockIn);
    if (invalidRow) return setError("Employee, date, and in time are required for every row.");
    if (manualRows.some((row) => row.date > today())) return setError("Future attendance is not allowed.");
    if (manualRows.some((row) => row.clockOut && row.clockOut <= row.clockIn)) return setError("Out time must be after in time.");

    setSavingManual(true);
    setError("");
    try {
      await Promise.all(manualRows.map((row) => attendanceApi.save({
        employeeId: row.employeeId,
        date: row.date,
        clockIn: row.clockIn,
        clockOut: row.clockOut || undefined,
        source: "MANUAL",
      })));
      setMessage(`Attendance saved for ${manualRows.length} employee(s).`);
      setManualPanelOpen(false);
      setManualRows([]);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSavingManual(false);
    }
  }

  function downloadTemplate() {
    const csv = `Employee Code,Punch Date,Punch Time,Type\n${employees.map((employee) => `${employee.employeeCode},,,`).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "attendance-punch-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function uploadPunches() {
    if (!file) return setError("Choose a CSV file first.");
    const rows = (await file.text()).trim().split(/\r?\n/).slice(1);
    let count = 0;
    for (const row of rows) {
      const [code, punchDate, punchTime, type] = row.split(",").map((value) => value.trim());
      const employee = employees.find((item) => item.employeeCode === code);
      if (employee && punchDate && punchTime) {
        const current = (await attendanceApi.list(punchDate, punchDate)).find((record) => record.employeeId === employee.id);
        await attendanceApi.save({ employeeId: employee.id, date: punchDate, clockIn: type.toUpperCase() === "IN" ? punchTime : current?.clockIn, clockOut: type.toUpperCase() === "OUT" ? punchTime : current?.clockOut, source: "PUNCH" });
        count++;
      }
    }
    setMessage(`${count} punch rows imported.`);
  }

  const employeeOptions = [
    { value: "0", label: "Choose employee", searchText: "choose employee" },
    ...employees.map((employee) => ({
      value: String(employee.id),
      label: `${employee.employeeCode} — ${employee.fullName}`,
      searchText: `${employee.employeeCode} ${employee.fullName} ${employee.designationTitle} ${employee.departmentName}`,
    })),
  ];

  return <div className="space-y-6"><Card><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Attendance</p><h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Employee Attendance</h2><p className="mt-2 text-sm text-ink/60">Record manual attendance or import punch data based on your system configuration.</p></div>{settings.attendanceMode === "MANUAL" && <Button onClick={openManualPanel}><Plus size={17} />Add attendance</Button>}</div></Card>
  {settings.attendanceMode === "MANUAL" ? <Card><h3 className="font-display text-xl font-extrabold">Manual attendance</h3><p className="mt-1 text-sm text-ink/60">Add multiple employees below and save their attendance together. The assigned shift start time is prefilled for each selected employee and date.</p></Card> : <Card><div className="flex items-center justify-between"><div><h3 className="font-display text-xl font-extrabold">Punch uploader</h3><p className="mt-1 text-sm text-ink/60">Employee Code, Punch Date, Punch Time, Type (IN/OUT).</p></div><Button variant="secondary" onClick={downloadTemplate}><Download size={17} />Download template</Button></div><div className="mt-6 flex flex-wrap items-end gap-4"><Input label="Upload CSV" type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0])} /><Button onClick={uploadPunches}><Upload size={17} />Import punches</Button>{settings.biometricEnabled && <span className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"><Wifi size={17} />Sync active <RefreshCw size={15} /></span>}</div></Card>}
  {manualPanelOpen && settings.attendanceMode === "MANUAL" && <Card className="border-2 border-fern/20"><div className="flex flex-col gap-3 border-b border-moss/10 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-display text-xl font-extrabold">Add attendance</h3><p className="mt-1 text-sm text-ink/60">Append employees and save all attendance rows at once.</p></div><Button type="button" variant="secondary" onClick={appendManualRow}><Plus size={16} />Add employee</Button></div><div className="mt-5 space-y-4">{manualRows.map((row, index) => <div key={row.id} className="rounded-3xl border border-moss/10 bg-white/70 p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold text-ink">Employee {index + 1}</p>{manualRows.length > 1 && <Button type="button" variant="danger" className="px-3" onClick={() => removeManualRow(row.id)}><Trash2 size={15} /></Button>}</div><div className="grid gap-4 md:grid-cols-4"><SearchableSelect label="Employee" value={String(row.employeeId)} options={employeeOptions} onChange={value => updateManualRow(row.id, { employeeId: Number(value) })} /><Input label="Date" type="date" max={today()} value={row.date} onChange={e => updateManualRow(row.id, { date: e.target.value })} /><Input label="In" type="time" value={row.clockIn} onChange={e => updateManualRow(row.id, { clockIn: e.target.value })} /><Input label="Out" type="time" disabled={!row.clockIn} value={row.clockOut} onChange={e => updateManualRow(row.id, { clockOut: e.target.value })} /></div><p className="mt-3 text-xs font-semibold text-fern">{row.employeeId && row.clockIn ? `Shift start time for ${row.date}: ${row.clockIn}` : "Select an employee to load the shift start time."}</p></div>)}</div><div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-moss/10 pt-4"><Button type="button" variant="secondary" onClick={closeManualPanel} disabled={savingManual}>Cancel</Button><Button type="button" onClick={saveManualRows} disabled={savingManual}><Save size={17} />{savingManual ? "Saving..." : `Save ${manualRows.length} attendance`}</Button></div></Card>}
  {(error || message) && <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</p>}</div>;
}
