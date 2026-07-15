import { FormEvent, type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw, Search, Trash2 } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { departmentApi, employeeApi, shiftApi, shiftAssignmentApi } from "../api/payroll";
import { useAuth } from "../auth/AuthContext";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmployeeAutocomplete } from "../components/ui/EmployeeAutocomplete";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { formatDate } from "../lib/format";
import type { Department, Employee, Shift, ShiftAssignment } from "../types";

interface EmployeeOption {
  id: number;
  employeeCode: string;
  fullName: string;
  designationTitle: string;
  departmentId: number;
  departmentName: string;
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

interface AssignmentDetailsMenu {
  assignment: ShiftAssignment;
  x: number;
  y: number;
}

const initialDepartments: Department[] = [];

const initialEmployees: EmployeeOption[] = [];

const initialAssignments: ShiftAssignment[] = [];

const initialForm: AssignmentForm = {
  employeeId: "",
  shiftId: "",
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

function toClockLabel(time: string, durationHours = 0, durationMinutes = 0) {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationHours * 60 + durationMinutes;
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}${totalMinutes >= 1440 ? " (Next Day)" : ""}`;
}

function shiftTone(index: number) {
  const tones = [
    "bg-emerald-100 text-emerald-800 border-emerald-200",
    "bg-amber-100 text-amber-800 border-amber-200",
    "bg-lagoon/10 text-lagoon border-lagoon/20",
    "bg-oat text-ink border-moss/10",
  ];
  return tones[index % tones.length];
}

function employeeToOption(employee: Employee): EmployeeOption {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    designationTitle: employee.designationTitle,
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
  const { viewMode } = useAuth();
  const isPersonnelMode = viewMode === "personnel";
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [employees, setEmployees] = useState<EmployeeOption[]>(initialEmployees);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [assignments, setAssignments] = useState<ShiftAssignment[]>(initialAssignments);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const [form, setForm] = useState<AssignmentForm>(initialForm);
  const [error, setError] = useState("");
  const [assignmentDetailsMenu, setAssignmentDetailsMenu] = useState<AssignmentDetailsMenu | null>(null);

  useEffect(() => {
    Promise.all([
      departmentApi.active(),
      isPersonnelMode ? employeeApi.me().then((employee) => ({ content: [employee] })) : employeeApi.search({ status: "ACTIVE", page: 0, size: 500 }),
      shiftApi.active(),
    ])
      .then(([departmentItems, employeePage, shiftItems]) => {
        if (departmentItems.length > 0) {
          setDepartments(departmentItems);
        }
        setShifts(shiftItems);

        if (employeePage.content.length > 0) {
          const nextEmployees = employeePage.content.map(employeeToOption);
          setEmployees(nextEmployees);
          setSelectedEmployeeId((current) => current || String(nextEmployees[0]?.id ?? ""));
          setSelectedEmployeeCode((current) => current || nextEmployees[0]?.employeeCode || "");
          setForm((current) => ({
            ...current,
            employeeId: current.employeeId || String(nextEmployees[0]?.id ?? ""),
          }));
        }
      })
      .catch(() => undefined);
  }, [isPersonnelMode]);

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
      setSelectedEmployeeCode(visibleEmployees[0].employeeCode);
    }
  }, [selectedEmployeeId, visibleEmployees]);

  const selectedEmployee = employees.find((employee) => employee.id === Number(selectedEmployeeId));
  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const calendarStart = calendarDays[0]?.dateKey;
  const calendarEnd = calendarDays[calendarDays.length - 1]?.dateKey;
  const selectedEmployeeAssignments = useMemo(
    () => assignments.filter((assignment) => String(assignment.employeeId) === selectedEmployeeId),
    [assignments, selectedEmployeeId],
  );

  const loadAssignments = useCallback((employeeId = selectedEmployeeId, startDate = calendarStart, endDate = calendarEnd) => {
    if (!employeeId || !startDate || !endDate) {
      setAssignments([]);
      return;
    }
    shiftAssignmentApi
      .search({ employeeId: Number(employeeId), startDate, endDate })
      .then(setAssignments)
      .catch((apiError) => setError(getErrorMessage(apiError)));
  }, [calendarEnd, calendarStart, selectedEmployeeId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    if (!assignmentDetailsMenu) {
      return undefined;
    }

    function closeDetailsMenu() {
      setAssignmentDetailsMenu(null);
    }

    window.addEventListener("click", closeDetailsMenu);
    window.addEventListener("scroll", closeDetailsMenu, true);
    window.addEventListener("resize", closeDetailsMenu);

    return () => {
      window.removeEventListener("click", closeDetailsMenu);
      window.removeEventListener("scroll", closeDetailsMenu, true);
      window.removeEventListener("resize", closeDetailsMenu);
    };
  }, [assignmentDetailsMenu]);

  function openAssignmentDialog(dateKey: string) {
    if (isPersonnelMode) {
      return;
    }
    setForm({
      employeeId: selectedEmployeeId,
      shiftId: shifts[0] ? String(shifts[0].id) : "",
      startDate: dateKey,
      endDate: dateKey,
    });
    setError("");
    setDialogOpen(true);
  }

  function chooseEmployee(employeeCode: string) {
    const employee = employees.find((item) => item.employeeCode === employeeCode);
    setSelectedEmployeeCode(employeeCode);
    setSelectedEmployeeId(employee ? String(employee.id) : "");
    setForm((current) => ({ ...current, employeeId: employee ? String(employee.id) : "" }));
  }

  function closeAssignmentDialog() {
    setDialogOpen(false);
    setError("");
  }

  function moveMonth(amount: number) {
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function showAssignmentDetails(event: MouseEvent, assignment: ShiftAssignment) {
    event.preventDefault();
    event.stopPropagation();
    setAssignmentDetailsMenu({
      assignment,
      x: Math.min(event.clientX, window.innerWidth - 288),
      y: Math.min(event.clientY, window.innerHeight - 288),
    });
  }

  async function commitAssignments(nextForm: AssignmentForm, overrideExisting: boolean) {
    await shiftAssignmentApi.create({
      employeeId: Number(nextForm.employeeId),
      shiftId: Number(nextForm.shiftId),
      startDate: nextForm.startDate,
      endDate: nextForm.endDate,
      overrideExisting,
    });
    setCurrentMonth(parseDateKey(nextForm.startDate));
    setSelectedEmployeeId(nextForm.employeeId);
    setSelectedEmployeeCode(employees.find((item) => String(item.id) === nextForm.employeeId)?.employeeCode || "");
    setDialogOpen(false);
    setWarningOpen(false);
    setPendingSave(null);
    setError("");
    loadAssignments(nextForm.employeeId);
  }

  async function saveAssignment(event: FormEvent) {
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

    try {
      await commitAssignments(form, false);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  async function confirmOverride() {
    if (!pendingSave) {
      return;
    }

    try {
      await commitAssignments(pendingSave.form, true);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  function cancelOverride() {
    setWarningOpen(false);
    setPendingSave(null);
  }

  async function removeAssignment(assignment: ShiftAssignment) {
    if (isPersonnelMode) {
      return;
    }
    if (!window.confirm(`Remove ${assignment.shiftName} for ${assignment.employeeName} on ${formatDate(assignment.date)}?`)) {
      return;
    }

    try {
      await shiftAssignmentApi.delete(assignment.id);
      loadAssignments();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  const upcomingAssignments = selectedEmployeeAssignments
    .filter((assignment) => assignment.date >= toDateKey(new Date()))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Card className="relative z-30 overflow-visible">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">
              {isPersonnelMode ? "Personnel" : "Attendance Setup"}
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">
              {isPersonnelMode ? "My Shift" : "Shift Assignment"}
            </h2>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ember text-ink shadow-glow">
            <CalendarDays size={22} />
          </div>
        </div>

        {!isPersonnelMode && (
          <div className="mt-6 grid gap-3 lg:grid-cols-[220px_1fr_280px]">
            <SearchableSelect
              aria-label="Filter by department"
              value={departmentFilter}
              options={[{ value: "", label: "All departments" }, ...departments.map((department) => ({ value: String(department.id), label: department.name, searchText: department.code }))]}
              onChange={setDepartmentFilter}
            />
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
            <EmployeeAutocomplete
              label=""
              value={selectedEmployeeCode}
              employees={visibleEmployees}
              onChange={chooseEmployee}
              placeholder="Select employee schedule"
            />
          </div>
        )}
      </Card>

      <section className="relative z-10 grid gap-6 xl:grid-cols-[1fr_320px]">
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
                  aria-disabled={isPersonnelMode}
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
                      const shiftIndex = shifts.findIndex((item) => item.id === assignment.shiftId);
                      return (
                        <span
                          key={assignment.id}
                          className={`block truncate rounded-xl border px-2 py-1 text-xs font-bold ${
                            shiftIndex >= 0 ? shiftTone(shiftIndex) : "border-slate-200 bg-slate-100 text-slate-700"
                          }`}
                          onContextMenu={(event) => showAssignmentDetails(event, assignment)}
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
                  {!isPersonnelMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 w-9 rounded-full p-0 text-red-700 hover:bg-red-50"
                      onClick={() => removeAssignment(assignment)}
                      aria-label="Remove assignment"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              ))}
              {upcomingAssignments.length === 0 && (
                <p className="rounded-3xl bg-white/70 p-4 text-sm font-semibold text-ink/55">No upcoming shifts.</p>
              )}
            </div>
          </div>
        </Card>
      </section>

      {assignmentDetailsMenu && (
        <div
          className="fixed z-[70] w-72 rounded-2xl border border-moss/10 bg-white p-4 text-sm shadow-card"
          style={{ left: assignmentDetailsMenu.x, top: assignmentDetailsMenu.y }}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-label="Shift details"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Shift Details</p>
          <h3 className="mt-2 font-display text-lg font-extrabold text-ink">{assignmentDetailsMenu.assignment.shiftName}</h3>
          <div className="mt-3 space-y-2 text-ink/70">
            <p>
              <span className="font-bold text-ink">Code:</span> {assignmentDetailsMenu.assignment.shiftCode}
            </p>
            <p>
              <span className="font-bold text-ink">Date:</span> {formatDate(assignmentDetailsMenu.assignment.date)}
            </p>
            <p>
              <span className="font-bold text-ink">Employee:</span> {assignmentDetailsMenu.assignment.employeeName}
            </p>
            <p>
              <span className="font-bold text-ink">Personnel Type:</span> {assignmentDetailsMenu.assignment.employmentType || "-"}
            </p>
            <p>
              <span className="font-bold text-ink">Department:</span> {assignmentDetailsMenu.assignment.departmentName}
            </p>
            <p>
              <span className="font-bold text-ink">Time:</span>{" "}
              {assignmentDetailsMenu.assignment.startTime} to{" "}
              {toClockLabel(
                assignmentDetailsMenu.assignment.startTime,
                assignmentDetailsMenu.assignment.durationHours,
                assignmentDetailsMenu.assignment.durationMinutes,
              )}
            </p>
            <p>
              <span className="font-bold text-ink">Duration:</span> {assignmentDetailsMenu.assignment.durationHours}h{" "}
              {assignmentDetailsMenu.assignment.durationMinutes}m
            </p>
          </div>
        </div>
      )}

      {!isPersonnelMode && <Modal
        open={dialogOpen}
        onClose={closeAssignmentDialog}
        title="Shift Assignment"
        description="Select a shift and date range. Each calendar day is stored as a separate assignment."
      >
        <form onSubmit={saveAssignment} className="space-y-4">
          <EmployeeAutocomplete
            label="Employee"
            value={employees.find((employee) => String(employee.id) === form.employeeId)?.employeeCode || selectedEmployeeCode}
            employees={visibleEmployees}
            onChange={chooseEmployee}
          />

          <SearchableSelect
              label="Shift"
              value={form.shiftId}
            options={shifts.map((shift) => ({
              value: String(shift.id),
              label: `${shift.name} (${shift.startTime} to ${toClockLabel(shift.startTime, shift.durationHours, shift.durationMinutes)})`,
              searchText: shift.code,
            }))}
            onChange={(value) => setForm({ ...form, shiftId: value })}
          />

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
      </Modal>}

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
