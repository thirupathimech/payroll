import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import { attendanceApi, employeeApi } from "../api/payroll";
import { getErrorMessage } from "../api/client";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import type { AttendanceRecord, Employee } from "../types";

const localDate = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const formatLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const totalHours = (clockIn?: string, clockOut?: string) => {
  if (!clockIn || !clockOut) return "—";
  const [inHour, inMinute] = clockIn.split(":").map(Number);
  const [outHour, outMinute] = clockOut.split(":").map(Number);
  let minutes = outHour * 60 + outMinute - (inHour * 60 + inMinute);
  if (minutes < 0) minutes += 24 * 60;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
};

export function AttendanceReportPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [from, setFrom] = useState(localDate());
  const [to, setTo] = useState(localDate());
  const [employeeId, setEmployeeId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    employeeApi.search({ status: "ACTIVE", page: 0, size: 1000 })
      .then((response) => setEmployees(response.content))
      .catch((apiError) => setError(getErrorMessage(apiError)));
  }, []);

  async function search() {
    if (from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setRecords(await attendanceApi.list(from, to));
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setLoading(false);
    }
  }

  const dates = useMemo(() => {
    const result: string[] = [];
    const cursor = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    while (cursor <= end && result.length < 366) {
      result.push(formatLocalDate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [from, to]);
  const visibleEmployees = employeeId ? employees.filter((employee) => employee.id === employeeId) : employees;
  const recordFor = (id: number, date: string) => records.find((record) => record.employeeId === id && record.date === date);
  const employeeOptions = [{ value: "0", label: "All employees", searchText: "all employees" }, ...employees.map((employee) => ({ value: String(employee.id), label: `${employee.employeeCode} — ${employee.fullName}`, searchText: `${employee.employeeCode} ${employee.fullName} ${employee.designationTitle} ${employee.departmentName}` }))];

  return <div className="space-y-6"><Card><p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Attendance reports</p><h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Employee Attendance</h2><p className="mt-2 text-sm text-ink/60">View attendance employee-wise and date-wise.</p><div className="mt-5 grid gap-4 md:grid-cols-4"><Input label="From date" type="date" value={from} onChange={e => setFrom(e.target.value)} /><Input label="To date" type="date" value={to} onChange={e => setTo(e.target.value)} /><SearchableSelect label="Employee" value={String(employeeId)} options={employeeOptions} onChange={value => setEmployeeId(Number(value))} /><Button className="self-end" onClick={search} disabled={loading}><Search size={17} />{loading ? "Loading..." : "View attendance"}</Button></div></Card>{error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}<Card className="overflow-hidden"><div className="mb-4 flex items-center gap-2"><CalendarDays size={18} className="text-fern" /><h3 className="font-display text-xl font-extrabold">Date-wise attendance</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-moss/10 text-xs uppercase tracking-[0.12em] text-ink/50"><th className="px-3 py-3">Employee</th>{dates.map(date => <th key={date} className="px-3 py-3">{date}</th>)}</tr></thead><tbody>{visibleEmployees.map(employee => <tr key={employee.id} className="border-b border-moss/5"><td className="px-3 py-4"><p className="font-bold text-ink">{employee.fullName}</p><p className="text-xs text-ink/50">{employee.employeeCode}</p></td>{dates.map(date => { const record = recordFor(employee.id, date); return <td key={date} className="px-3 py-4 align-top">{record ? <div className="space-y-1"><Badge value="Present" /><p className="text-xs text-ink/60">IN {record.clockIn || "-"}</p><p className="text-xs text-ink/60">OUT {record.clockOut || "-"}</p><p className="mt-2 border-t border-moss/10 pt-2 text-xs font-bold text-fern">Hours {totalHours(record.clockIn, record.clockOut)}</p></div> : <Badge value="Absent" />}</td>; })}</tr>)}{!loading && visibleEmployees.length === 0 && <tr><td colSpan={dates.length + 1} className="px-3 py-8 text-center text-sm text-ink/55">No employees found.</td></tr>}</tbody></table></div></Card></div>;
}
