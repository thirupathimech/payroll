import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw, Search, Trash2 } from "lucide-react";
import { departmentApi, employeeApi } from "../api/payroll";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { formatDate } from "../lib/format";
import type { Department, Employee } from "../types";

interface ShiftOption {
  id: number;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  tone: string;
}

interface EmployeeOption {
  id: number;
  employeeCode: string;
  fullName: string;
  departmentId: number;
  departmentName: string;
}

interface ShiftAssignment {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentId: number;
  departmentName: string;
  shiftId: number;
  shiftName: string;
  shiftCode: string;
  date: string;
}

interface AssignmentForm {
  employeeId: string;
  shiftId: string;
  startDate: string;
  endDate: string;
}

interface PendingSave {
  form: AssignmentForm;
  dates: string[];
  conflicts: ShiftAssignment[];
}

const shifts: ShiftOption[] = [
  {
    id: 1,
    name: "Morning Shift",
    code: "MOR",
    startTime: "06:00 AM",
    endTime: "02:00 PM",
    tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  {
    id: 2,
    name: "Evening Shift",
    code: "EVE",
    startTime: "02:00 PM",
    endTime: "10:00 PM",
    tone: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    id: 3,
    name: "Night Shift",
    code: "NGT",
    startTime: "10:00 PM",
    endTime: "06:00 AM (Next Day)",
    tone: "bg-lagoon/10 text-lagoon border-lagoon/20",
  },
  {
    id: 4,
    name: "Weekend Support",
    code: "WKS",
    startTime: "08:30 AM",
    endTime: "02:30 PM",
    tone: "bg-oat text-ink border-moss/10",
  },
];

const seedDepartments: Department[] = [
  { id: 1, name: "Human Resources", code: "HR", active: true, createdAt: "", updatedAt: "" },
  { id: 2, name: "Finance", code: "FIN", active: true, createdAt: "", updatedAt: "" },
  { id: 3, name: "Operations", code: "OPS", active: true, createdAt: "", updatedAt: "" },
];

const seedEmployees: EmployeeOption[] = [
  { id: 1, employeeCode: "EMP-001", fullName: "Aarav Sharma", departmentId: 1, departmentName: "Human Resources" },
  { id: 2, employeeCode: "EMP-014", fullName: "Meera Iyer", departmentId: 2, departmentName: "Finance" },
  { id: 3, employeeCode: "EMP-026", fullName: "Kabir Khan", departmentId: 3, departmentName: "Operations" },
  { id: 4, employeeCode: "EMP-041", fullName: "Nisha Rao", departmentId: 3, departmentName: "Operations" },
];

const initialAssignments: ShiftAssignment[] = [
  {
    id: 1,
    employeeId: 1,
    employeeCode: "EMP-001",
    employeeName: "Aarav Sharma",
    departmentId: 1,
    departmentName: "Human Resources",
    shiftId: 1,
    shiftName: "Morning Shift",
    shiftCode: "MOR",
    date: "2026-06-10",
  },
  {
    id: 2,
    employeeId: 1,
    employeeCode: "EMP-001",
    employeeName: "Aarav Sharma",
    departmentId: 1,
    departmentName: "Human Resources",
    shiftId: 3,
    shiftName: "Night Shift",
    shiftCode: "NGT",
    date: "2026-06-11",
  },
  {
    id: 3,
    employeeId: 2,
    employeeCode: "EMP-014",
    employeeName: "Meera Iyer",
    departmentId: 2,
    departmentName: "Finance",
    shiftId: 2,
    shiftName: "Evening Shift",
    shiftCode: "EVE",
    date: "2026-06-12",
  },
  {
    id: 4,
    employeeId: 3,
    employeeCode: "EMP-026",
    employeeName: "Kabir Khan",
    departmentId: 3,
    departmentName: "Operations",
    shiftId: 3,
    shiftName: "Night Shift",
    shiftCode: "NGT",
    date: "2026-06-15",
  },
];

const initialForm: AssignmentForm = {
  employeeId: String(seedEmployees[0].id),
  shiftId: String(shifts[0].id),
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function addDays(dateKey: string, amount: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

function eachDateInRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function employeeToOption(employee: Employee): EmployeeOption {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    departmentId: employee.departmentId,
    departmentName: employee.departmentName,
  };
}

function buildCalendarDays(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const calendarStart = new Date(firstOfMonth);
  calendarStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return {
      date,
      dateKey: toDateKey(date),
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

export function ShiftAssignmentPage() {
  const [departments, setDepartments] = useState<Department[]>(seedDepartments);
  const [employees, setEmployees] = useState<EmployeeOption[]>(seedEmployees);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(String(seedEmployees[0].id));
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 5, 1));
  const [assignments, setAssignments] = useState<ShiftAssignment[]>(initialAssignments);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const [form, setForm] = useState<AssignmentForm>(initialForm);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      departmentApi.active(),
      employeeApi.search({ status: "ACTIVE", page: 0, size: 500 }),
    ])
      .then(([departmentItems, employeePage]) => {
        if (departmentItems.length > 0) {
          setDepartments(departmentItems);
        }

        if (employeePage.content.length > 0) {
          const nextEmployees = employeePage.content.map(employeeToOption);
          setEmployees(nextEmployees);
          setSelectedEmployeeId((current) => current || String(nextEmployees[0]?.id ?? ""));
          setForm((current) => ({
            ...current,
            employeeId: current.employeeId || String(nextEmployees[0]?.id ?? ""),
          }));
        }
      })
      .catch(() => undefined);
  }, []);

  const visibleEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const matchesDepartment = !departmentFilter || employee.departmentId === Number(departmentFilter);
        const query = employeeSearch.trim().toLowerCase();
        const matchesSearch =
          !query ||
          employee.fullName.toLowerCase().includes(query) ||
          employee.employeeCode.toLowerCase().includes(query);

        return matchesDepartment && matchesSearch;
      }),
    [departmentFilter, employeeSearch, employees],
  );

  useEffect(() => {
    if (visibleEmployees.length > 0 && !visibleEmployees.some((employee) => String(employee.id) === selectedEmployeeId)) {
      setSelectedEmployeeId(String(visibleEmployees[0].id));
    }
  }, [selectedEmployeeId, visibleEmployees]);

  const selectedEmployee = employees.find((employee) => employee.id === Number(selectedEmployeeId));
  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const selectedEmployeeAssignments = useMemo(
    () => assignments.filter((assignment) => String(assignment.employeeId) === selectedEmployeeId),
    [assignments, selectedEmployeeId],
  );

  function openAssignmentDialog(dateKey: string) {
    setForm({
      employeeId: selectedEmployeeId,
      shiftId: String(shifts[0].id),
      startDate: dateKey,
      endDate: dateKey,
    });
    setError("");
    setDialogOpen(true);
  }

  function closeAssignmentDialog() {
    setDialogOpen(false);
    setError("");
  }

  function moveMonth(amount: number) {
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function buildAssignments(nextForm: AssignmentForm, dates: string[]) {
    const employee = employees.find((item) => item.id === Number(nextForm.employeeId));
    const shift = shifts.find((item) => item.id === Number(nextForm.shiftId));

    if (!employee || !shift) {
      return [];
    }

    return dates.map((date, index) => ({
      id: Date.now() + index,
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      employeeName: employee.fullName,
      departmentId: employee.departmentId,
      departmentName: employee.departmentName,
      shiftId: shift.id,
      shiftName: shift.name,
      shiftCode: shift.code,
      date,
    }));
  }

  function commitAssignments(nextForm: AssignmentForm, dates: string[]) {
    const nextAssignments = buildAssignments(nextForm, dates);

    setAssignments((current) => {
      const dateSet = new Set(dates);
      const employeeId = Number(nextForm.employeeId);
      const preservedAssignments = current.filter(
        (assignment) => assignment.employeeId !== employeeId || !dateSet.has(assignment.date),
      );

      return [...preservedAssignments, ...nextAssignments].sort((left, right) => left.date.localeCompare(right.date));
    });
    setCurrentMonth(parseDateKey(nextForm.startDate));
    setSelectedEmployeeId(nextForm.employeeId);
    setDialogOpen(false);
    setWarningOpen(false);
    setPendingSave(null);
    setError("");
  }

  function saveAssignment(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!form.employeeId || !form.shiftId) {
      setError("Employee and shift are required.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError("Start Date and End Date are required.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError("End Date cannot be before Start Date.");
      return;
    }

    const dates = eachDateInRange(form.startDate, form.endDate);
    const conflicts = assignments.filter(
      (assignment) => assignment.employeeId === Number(form.employeeId) && dates.includes(assignment.date),
    );

    if (conflicts.length > 0) {
      setPendingSave({ form: { ...form }, dates, conflicts });
      setWarningOpen(true);
      return;
    }

    commitAssignments(form, dates);
  }

  function confirmOverride() {
    if (!pendingSave) {
      return;
    }

    commitAssignments(pendingSave.form, pendingSave.dates);
  }

  function cancelOverride() {
    setWarningOpen(false);
    setPendingSave(null);
  }

  function removeAssignment(assignment: ShiftAssignment) {
    if (!window.confirm(`Remove ${assignment.shiftName} for ${assignment.employeeName} on ${formatDate(assignment.date)}?`)) {
      return;
    }

    setAssignments((current) => current.filter((item) => item.id !== assignment.id));
  }

  const upcomingAssignments = selectedEmployeeAssignments
    .filter((assignment) => assignment.date >= toDateKey(new Date()))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Attendance Setup</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Shift Assignment</h2>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ember text-ink shadow-glow">
            <CalendarDays size={22} />
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[220px_1fr_280px]">
          <Select
            aria-label="Filter by department"
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
            <Input
              aria-label="Employee search"
              placeholder="Search by employee name or ID"
              className="pl-11"
              value={employeeSearch}
              onChange={(event) => setEmployeeSearch(event.target.value)}
            />
          </div>
          <Select
            aria-label="Select employee schedule"
            value={selectedEmployeeId}
            onChange={(event) => setSelectedEmployeeId(event.target.value)}
          >
            {visibleEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employeeCode} - {employee.fullName}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 border-b border-moss/10 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Schedule</p>
              <h3 className="mt-1 font-display text-2xl font-extrabold text-ink">{monthLabel(currentMonth)}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="px-3" onClick={() => moveMonth(-1)} aria-label="Previous month">
                <ChevronLeft size={17} />
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCurrentMonth(new Date())}>
                <RotateCcw size={16} />
                Today
              </Button>
              <Button type="button" variant="secondary" className="px-3" onClick={() => moveMonth(1)} aria-label="Next month">
                <ChevronRight size={17} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-moss/10 bg-moss/5">
            {weekdayLabels.map((day) => (
              <div key={day} className="px-3 py-3 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-ink/55">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dayAssignments = selectedEmployeeAssignments.filter((assignment) => assignment.date === day.dateKey);
              const isToday = day.dateKey === toDateKey(new Date());

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  className={`min-h-[108px] border-b border-r border-moss/10 p-2 text-left transition hover:bg-fern/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-fern/30 ${
                    day.inCurrentMonth ? "bg-white/60" : "bg-oat/35 text-ink/35"
                  }`}
                  onClick={() => openAssignmentDialog(day.dateKey)}
                >
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-sm font-extrabold ${
                      isToday ? "bg-moss text-white" : "text-ink/70"
                    }`}
                  >
                    {day.date.getDate()}
                  </span>
                  <div className="mt-2 space-y-1">
                    {dayAssignments.map((assignment) => {
                      const shift = shifts.find((item) => item.id === assignment.shiftId);
                      return (
                        <span
                          key={assignment.id}
                          className={`block truncate rounded-xl border px-2 py-1 text-xs font-bold ${
                            shift?.tone ?? "border-slate-200 bg-slate-100 text-slate-700"
                          }`}
                        >
                          {assignment.shiftCode} - {assignment.shiftName}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Employee</p>
            <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">
              {selectedEmployee?.fullName ?? "No employee selected"}
            </h3>
            <p className="mt-1 text-sm font-semibold text-ink/55">
              {selectedEmployee ? `${selectedEmployee.employeeCode} - ${selectedEmployee.departmentName}` : "-"}
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-3xl bg-oat/70 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Assigned Days</p>
              <p className="mt-3 font-display text-3xl font-extrabold text-ink">{selectedEmployeeAssignments.length}</p>
            </div>
            <div className="rounded-3xl bg-lagoon/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Calendar Rule</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">Only one shift is allowed per employee per day.</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Upcoming</p>
            <div className="mt-3 space-y-3">
              {upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-start justify-between gap-3 rounded-3xl border border-moss/10 bg-white/70 p-4">
                  <div>
                    <p className="font-bold text-ink">{assignment.shiftName}</p>
                    <p className="text-sm text-ink/55">{formatDate(assignment.date)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-9 rounded-full p-0 text-red-700 hover:bg-red-50"
                    onClick={() => removeAssignment(assignment)}
                    aria-label="Remove assignment"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              {upcomingAssignments.length === 0 && (
                <p className="rounded-3xl bg-white/70 p-4 text-sm font-semibold text-ink/55">No upcoming shifts.</p>
              )}
            </div>
          </div>
        </Card>
      </section>

      <Modal
        open={dialogOpen}
        onClose={closeAssignmentDialog}
        title="Shift Assignment"
        description="Select a shift and date range. Each calendar day is stored as a separate assignment."
      >
        <form onSubmit={saveAssignment} className="space-y-4">
          <Select
            label="Employee"
            value={form.employeeId}
            onChange={(event) => setForm({ ...form, employeeId: event.target.value })}
          >
            {visibleEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employeeCode} - {employee.fullName}
              </option>
            ))}
          </Select>

          <Select label="Shift" value={form.shiftId} onChange={(event) => setForm({ ...form, shiftId: event.target.value })}>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name} ({shift.startTime} to {shift.endTime})
              </option>
            ))}
          </Select>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Start Date"
              type="date"
              required
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              required
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
            />
          </div>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeAssignmentDialog}>
              Cancel
            </Button>
            <Button type="submit">Save Assignment</Button>
          </div>
        </form>
      </Modal>

      {warningOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl animate-rise rounded-[2rem] bg-shell p-6 shadow-card">
            <div className="mb-5">
              <Badge value="Override Required" />
              <h3 className="mt-4 font-display text-2xl font-extrabold text-ink">Existing shift assignment found</h3>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                One or more selected dates already have shift assignments for this employee. Do you want to override the existing assignment(s)?
              </p>
            </div>

            {pendingSave && (
              <div className="mb-5 max-h-44 overflow-auto rounded-3xl border border-moss/10 bg-white/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Conflicting Dates</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pendingSave.conflicts.map((conflict) => (
                    <span key={conflict.id} className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                      {formatDate(conflict.date)} - {conflict.shiftName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={cancelOverride}>
                No
              </Button>
              <Button type="button" onClick={confirmOverride}>
                Yes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
