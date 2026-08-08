import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarOff, Plus, Trash2, UserRound, UsersRound } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { branchApi, departmentApi, designationApi, employeeApi, weekOffAssignmentApi, weekOffExclusionApi } from "../api/payroll";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmployeeAutocomplete } from "../components/ui/EmployeeAutocomplete";
import { Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { formatDate } from "../lib/format";
import { hasRoleAccess, HR_ROLES } from "../lib/access";
import type {
  Branch,
  Department,
  Designation,
  Employee,
  WeekDayName,
  WeekOffAssignment,
  WeekOffAssignmentType,
  WeekOffExclusion,
} from "../types";

interface EmployeeOption {
  id: number;
  employeeCode: string;
  fullName: string;
  branchId?: number;
  branchName?: string;
  departmentId: number;
  departmentName: string;
  designationId: number;
  designationTitle: string;
}

const weekDays: Array<{ value: WeekDayName; label: string; short: string }> = [
  { value: "SUNDAY", label: "Sunday", short: "Sun" },
  { value: "MONDAY", label: "Monday", short: "Mon" },
  { value: "TUESDAY", label: "Tuesday", short: "Tue" },
  { value: "WEDNESDAY", label: "Wednesday", short: "Wed" },
  { value: "THURSDAY", label: "Thursday", short: "Thu" },
  { value: "FRIDAY", label: "Friday", short: "Fri" },
  { value: "SATURDAY", label: "Saturday", short: "Sat" },
];

const typeLabels: Record<WeekOffAssignmentType, string> = {
  GROUP_WEEKLY: "Branch / Department / Designation",
  EMPLOYEE_DATE: "Employee Date",
  EMPLOYEE_WEEKLY: "Employee Weekly",
};

function employeeToOption(employee: Employee): EmployeeOption {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    branchId: employee.branchId,
    branchName: employee.branchName,
    departmentId: employee.departmentId,
    departmentName: employee.departmentName,
    designationId: employee.designationId,
    designationTitle: employee.designationTitle,
  };
}

function dayLabel(day?: WeekDayName) {
  return weekDays.find((item) => item.value === day)?.label ?? "-";
}

function toggleDay(days: WeekDayName[], day: WeekDayName) {
  return days.includes(day) ? days.filter((item) => item !== day) : [...days, day];
}

function DayCheckboxGroup({
  value,
  onChange,
  compact = false,
}: {
  value: WeekDayName[];
  onChange: (days: WeekDayName[]) => void;
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {weekDays.map((day) => {
        const checked = value.includes(day.value);
        return (
          <label
            key={day.value}
            className={`flex cursor-pointer items-center justify-between rounded-2xl border px-3 py-3 text-sm font-bold transition ${
              checked ? "border-moss bg-moss text-white shadow-glow" : "border-moss/15 bg-white/80 text-ink hover:bg-white"
            } ${compact ? "xl:flex-col xl:justify-center xl:gap-1" : ""}`}
          >
            <span>{compact ? day.short : day.label}</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-fern"
              checked={checked}
              onChange={() => onChange(toggleDay(value, day.value))}
            />
          </label>
        );
      })}
    </div>
  );
}

export function WeekOffAssignmentPage() {
  const { user } = useAuth();
  const canManageGroupRules = hasRoleAccess(user, HR_ROLES) || user?.role === "MANAGER";
  const isLead = user?.role === "LEAD";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [assignments, setAssignments] = useState<WeekOffAssignment[]>([]);
  const [exclusions, setExclusions] = useState<WeekOffExclusion[]>([]);
  const [groupDays, setGroupDays] = useState<WeekDayName[]>(["SUNDAY"]);
  const [groupBranchId, setGroupBranchId] = useState("");
  const [groupDepartmentId, setGroupDepartmentId] = useState("");
  const [groupDesignationId, setGroupDesignationId] = useState("");
  const [excludeDate, setExcludeDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedExcludeDates, setSelectedExcludeDates] = useState<string[]>([]);
  const [dateEmployeeCode, setDateEmployeeCode] = useState("");
  const [dateValue, setDateValue] = useState(new Date().toISOString().slice(0, 10));
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [weeklyEmployeeCode, setWeeklyEmployeeCode] = useState("");
  const [employeeDays, setEmployeeDays] = useState<WeekDayName[]>(["SUNDAY"]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingAction, setSavingAction] = useState<"" | "GROUP_WEEKLY" | "EMPLOYEE_DATE" | "EMPLOYEE_WEEKLY">("");

  useEffect(() => {
    Promise.all([
      branchApi.active(),
      departmentApi.active(),
      designationApi.search({ active: true, page: 0, size: 500 }),
      employeeApi.search({ status: "ACTIVE", page: 0, size: 500 }),
      weekOffAssignmentApi.search({}),
      weekOffExclusionApi.search(),
    ])
      .then(([branchItems, departmentItems, designationPage, employeePage, assignmentItems, exclusionItems]) => {
        setBranches(branchItems);
        setDepartments(departmentItems);
        setDesignations(designationPage.content);
        const nextEmployees = employeePage.content.map(employeeToOption);
        setEmployees(nextEmployees);
        setAssignments(assignmentItems);
        setExclusions(exclusionItems);
        setGroupBranchId(String(branchItems[0]?.id ?? ""));
        setGroupDepartmentId(String(departmentItems[0]?.id ?? ""));
        setGroupDesignationId(String(designationPage.content[0]?.id ?? ""));
        setDateEmployeeCode(nextEmployees[0]?.employeeCode ?? "");
        setWeeklyEmployeeCode(nextEmployees[0]?.employeeCode ?? "");
      })
      .catch((apiError) => setError(getErrorMessage(apiError)));
  }, []);

  const groupDesignationOptions = useMemo(
    () =>
      designations
        .filter((designation) => !groupDepartmentId || designation.departmentId === Number(groupDepartmentId))
        .map((designation) => ({
          value: String(designation.id),
          label: designation.title,
          searchText: `${designation.code} ${designation.departmentName}`,
        })),
    [designations, groupDepartmentId],
  );

  useEffect(() => {
    if (groupDesignationOptions.length > 0 && !groupDesignationOptions.some((option) => option.value === groupDesignationId)) {
      setGroupDesignationId(groupDesignationOptions[0].value);
    }
  }, [groupDesignationId, groupDesignationOptions]);

  const dateEmployee = employees.find((employee) => employee.employeeCode === dateEmployeeCode);
  const weeklyEmployee = employees.find((employee) => employee.employeeCode === weeklyEmployeeCode);

  function reloadAssignments() {
    return weekOffAssignmentApi.search({}).then(setAssignments);
  }

  function addExcludeDate() {
    if (!excludeDate) return;
    setSelectedExcludeDates((current) => [...new Set([...current, excludeDate])].sort());
  }

  function addSelectedDate() {
    setError("");
    setSuccess("");
    if (!dateValue) {
      setError("Date is required.");
      return;
    }
    setSelectedDates((current) => [...new Set([...current, dateValue])].sort());
  }

  async function saveGroupWeekly(event: FormEvent) {
    event.preventDefault();
    if (savingAction) {
      return;
    }
    setError("");
    setSuccess("");
    if (!groupBranchId || !groupDepartmentId || !groupDesignationId || groupDays.length === 0) {
      setError("Branch, department, designation, and days are required.");
      return;
    }
    try {
      setSavingAction("GROUP_WEEKLY");
      await weekOffAssignmentApi.create({
        type: "GROUP_WEEKLY",
        branchId: Number(groupBranchId),
        departmentId: Number(groupDepartmentId),
        designationId: Number(groupDesignationId),
        dayOfWeeks: groupDays,
      });
      for (const date of selectedExcludeDates) {
        await weekOffExclusionApi.create({ branchId: Number(groupBranchId), departmentId: Number(groupDepartmentId), designationId: Number(groupDesignationId), date });
      }
      await reloadAssignments();
      setExclusions(await weekOffExclusionApi.search());
      setSelectedExcludeDates([]);
      setSuccess("Group week off and exclude dates saved.");
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSavingAction("");
    }
  }

  async function saveEmployeeDates(event: FormEvent) {
    event.preventDefault();
    if (savingAction) {
      return;
    }
    setError("");
    setSuccess("");
    if (!dateEmployee || selectedDates.length === 0) {
      setError("Employee and dates are required.");
      return;
    }
    try {
      setSavingAction("EMPLOYEE_DATE");
      await weekOffAssignmentApi.create({
        type: "EMPLOYEE_DATE",
        employeeId: dateEmployee.id,
        dates: selectedDates,
      });
      await reloadAssignments();
      setSelectedDates([]);
      setSuccess("Employee date week off saved.");
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSavingAction("");
    }
  }

  async function saveEmployeeWeekly(event: FormEvent) {
    event.preventDefault();
    if (savingAction) {
      return;
    }
    setError("");
    setSuccess("");
    if (!weeklyEmployee || employeeDays.length === 0) {
      setError("Employee and days are required.");
      return;
    }
    try {
      setSavingAction("EMPLOYEE_WEEKLY");
      await weekOffAssignmentApi.create({
        type: "EMPLOYEE_WEEKLY",
        employeeId: weeklyEmployee.id,
        dayOfWeeks: employeeDays,
      });
      await reloadAssignments();
      setSuccess("Employee weekly week off saved.");
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSavingAction("");
    }
  }

  async function deleteAssignment(assignment: WeekOffAssignment) {
    if (!window.confirm("Delete this week off assignment?")) {
      return;
    }
    try {
      await weekOffAssignmentApi.delete(assignment.id);
      await reloadAssignments();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Attendance Setup</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Week Off Assignment</h2>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ember text-ink shadow-glow">
            <CalendarOff size={22} />
          </div>
        </div>
        {(error || success) && (
          <div className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {error || success}
          </div>
        )}
      </Card>

      <section className={`grid gap-6 ${canManageGroupRules ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
        {canManageGroupRules && (
          <Card>
            <form onSubmit={saveGroupWeekly} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-moss text-white">
                  <UsersRound size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Rule</p>
                  <h3 className="font-display text-xl font-extrabold text-ink">Branch / Department / Designation</h3>
                </div>
              </div>

              <DayCheckboxGroup value={groupDays} onChange={setGroupDays} compact />

              <div className="space-y-3 rounded-2xl border border-moss/10 bg-oat/40 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-fern">Exclude Dates</p>
                  <p className="mt-1 text-xs font-semibold text-ink/55">On these dates, the selected weekly off rule will not apply.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input label="Exclude Date" type="date" value={excludeDate} onChange={(event) => setExcludeDate(event.target.value)} />
                  <Button type="button" variant="secondary" className="self-end" onClick={addExcludeDate}>Add Date</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedExcludeDates.map((date) => (
                    <button key={date} type="button" className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ink shadow-sm" onClick={() => setSelectedExcludeDates((current) => current.filter((item) => item !== date))}>
                      {formatDate(date)} ×
                    </button>
                  ))}
                  {selectedExcludeDates.length === 0 && <span className="text-xs font-semibold text-ink/45">No exclude dates selected</span>}
                </div>
              </div>

              <div className="grid gap-4">
                <SearchableSelect
                  label="Branch"
                  value={groupBranchId}
                  options={branches.map((branch) => ({ value: String(branch.id), label: branch.name, searchText: branch.code }))}
                  onChange={setGroupBranchId}
                />
                <SearchableSelect
                  label="Department"
                  value={groupDepartmentId}
                  options={departments.map((department) => ({ value: String(department.id), label: department.name, searchText: department.code }))}
                  onChange={setGroupDepartmentId}
                />
                <SearchableSelect
                  label="Designation"
                  value={groupDesignationId}
                  options={groupDesignationOptions}
                  onChange={setGroupDesignationId}
                />
              </div>

              <Button type="submit" className="w-full" disabled={savingAction === "GROUP_WEEKLY"}>
                {savingAction === "GROUP_WEEKLY" ? "Saving..." : "Save Rule"}
              </Button>
            </form>
          </Card>
        )}

        <Card>
          <form onSubmit={saveEmployeeDates} className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lagoon text-white">
                <UserRound size={20} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Date Wise</p>
                <h3 className="font-display text-xl font-extrabold text-ink">Employee Week Off</h3>
              </div>
            </div>

            <EmployeeAutocomplete
              label="Employee"
              value={dateEmployeeCode}
              employees={employees}
              onChange={setDateEmployeeCode}
              placeholder="Select employee"
            />

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input label="Week Off Date" type="date" value={dateValue} onChange={(event) => setDateValue(event.target.value)} />
              <Button type="button" variant="secondary" className="self-end" onClick={addSelectedDate}>
                <Plus size={16} />
                Add
              </Button>
            </div>

            <div className="min-h-16 rounded-2xl border border-moss/10 bg-oat/55 p-3">
              <div className="flex flex-wrap gap-2">
                {selectedDates.map((date) => (
                  <button
                    key={date}
                    type="button"
                    className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ink shadow-sm"
                    onClick={() => setSelectedDates((current) => current.filter((item) => item !== date))}
                  >
                    {formatDate(date)}
                  </button>
                ))}
                {selectedDates.length === 0 && <span className="px-1 py-2 text-sm font-semibold text-ink/45">No dates selected</span>}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={savingAction === "EMPLOYEE_DATE"}>
              {savingAction === "EMPLOYEE_DATE" ? "Saving..." : "Save Dates"}
            </Button>
          </form>
        </Card>

        <Card>
          <form onSubmit={saveEmployeeWeekly} className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-ember text-ink">
                <CalendarOff size={20} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Weekly</p>
                <h3 className="font-display text-xl font-extrabold text-ink">Employee Days</h3>
              </div>
            </div>

            <DayCheckboxGroup value={employeeDays} onChange={setEmployeeDays} compact />

            <EmployeeAutocomplete
              label="Employee"
              value={weeklyEmployeeCode}
              employees={employees}
              onChange={setWeeklyEmployeeCode}
              placeholder="Select employee"
            />

            <Button type="submit" className="w-full" disabled={savingAction === "EMPLOYEE_WEEKLY"}>
              {savingAction === "EMPLOYEE_WEEKLY" ? "Saving..." : "Save Days"}
            </Button>
          </form>
        </Card>
      </section>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-moss/10 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Saved</p>
          <h3 className="mt-1 font-display text-2xl font-extrabold text-ink">Week Off Exclude Dates</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-moss/5 text-xs font-extrabold uppercase tracking-[0.14em] text-ink/55"><tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Branch</th><th className="px-5 py-4">Department</th><th className="px-5 py-4">Designation</th><th className="px-5 py-4 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-moss/10">
              {exclusions.map((item) => <tr key={item.id} className="bg-white/45"><td className="px-5 py-4 font-semibold text-ink">{formatDate(item.date)}</td><td className="px-5 py-4 text-ink/70">{item.branchName}</td><td className="px-5 py-4 text-ink/70">{item.departmentName}</td><td className="px-5 py-4 text-ink/70">{item.designationTitle}</td><td className="px-5 py-4 text-right"><Button type="button" variant="ghost" className="h-9 w-9 rounded-full p-0 text-red-700 hover:bg-red-50" onClick={async () => { try { await weekOffExclusionApi.delete(item.id); setExclusions(await weekOffExclusionApi.search()); } catch (apiError) { setError(getErrorMessage(apiError)); } }} aria-label="Delete exclude date"><Trash2 size={16} /></Button></td></tr>)}
              {exclusions.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm font-semibold text-ink/45">No exclude dates found.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-moss/10 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Saved</p>
          <h3 className="mt-1 font-display text-2xl font-extrabold text-ink">Week Off Rules</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-moss/5 text-xs font-extrabold uppercase tracking-[0.14em] text-ink/55">
              <tr>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Branch</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Designation</th>
                <th className="px-5 py-4">Day / Date</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-moss/10">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="bg-white/45">
                  <td className="px-5 py-4 font-bold text-ink">{typeLabels[assignment.type]}</td>
                  <td className="px-5 py-4 text-ink/70">
                    {assignment.employeeName ? `${assignment.employeeName} (${assignment.employeeCode})` : "-"}
                  </td>
                  <td className="px-5 py-4 text-ink/70">{assignment.branchName ?? "-"}</td>
                  <td className="px-5 py-4 text-ink/70">{assignment.departmentName ?? "-"}</td>
                  <td className="px-5 py-4 text-ink/70">{assignment.designationTitle ?? "-"}</td>
                  <td className="px-5 py-4 font-semibold text-ink">
                    {assignment.date ? formatDate(assignment.date) : dayLabel(assignment.dayOfWeek)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {(!isLead || assignment.employeeId) && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 w-9 rounded-full p-0 text-red-700 hover:bg-red-50"
                        onClick={() => deleteAssignment(assignment)}
                        aria-label="Delete assignment"
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm font-semibold text-ink/45">
                    No week off assignments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
