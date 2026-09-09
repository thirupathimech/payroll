import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plus, Search, X } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { employeeApi, leaveApi, shiftAssignmentApi } from "../api/payroll";
import { useAuth } from "../auth/AuthContext";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type Column } from "../components/ui/DataTable";
import { EmployeeAutocomplete } from "../components/ui/EmployeeAutocomplete";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { Textarea } from "../components/ui/Textarea";
import { formatDate } from "../lib/format";
import { hasRoleAccess, HR_ROLES } from "../lib/access";
import { useDebounce } from "../hooks/useDebounce";
import type {
  Employee,
  LeaveBalance,
  LeaveBalanceAllocationPayload,
  LeavePayload,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  PageResponse,
} from "../types";

const emptyPage: PageResponse<LeaveRequest> = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

const leaveTypes: LeaveType[] = ["ANNUAL", "SICK", "CASUAL", "MATERNITY", "PATERNITY", "UNPAID"];
const trackedLeaveTypes: Exclude<LeaveType, "UNPAID">[] = ["ANNUAL", "SICK", "CASUAL", "MATERNITY", "PATERNITY"];
const leaveStatuses: LeaveStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

interface BalanceDraft {
  leaveType: Exclude<LeaveType, "UNPAID">;
  allocatedHours: string;
  carriedForwardHours: string;
}

interface LeaveShiftStatus {
  loading: boolean;
  error: string;
}

function formatLeaveHours(minutes: number) {
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const remainingMinutes = absoluteMinutes % 60;
  return `${minutes < 0 ? "-" : ""}${hours}h ${String(remainingMinutes).padStart(2, "0")}m`;
}

function minutesToHours(minutes: number) {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : String(Number(hours.toFixed(2)));
}

function hoursToMinutes(hours: string) {
  const value = Number(hours);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 60) : null;
}

function datesBetween(startDate: string, endDate: string) {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (current <= end) {
    dates.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

const initialForm: LeavePayload = {
  employeeId: 0,
  leaveType: "ANNUAL",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  startTime: "09:00",
  endTime: "18:00",
  reason: "",
};

export function LeavePage() {
  const { viewMode, user } = useAuth();
  const isPersonnelMode = viewMode === "personnel";
  const canManageBalances = !isPersonnelMode && hasRoleAccess(user, HR_ROLES);
  const [leaves, setLeaves] = useState(emptyPage);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<LeavePayload>(initialForm);
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState("");
  const [error, setError] = useState("");
  const [leaveShiftStatus, setLeaveShiftStatus] = useState<LeaveShiftStatus>({ loading: false, error: "" });
  const [decision, setDecision] = useState<{ leave: LeaveRequest; status: LeaveStatus } | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [balanceYear, setBalanceYear] = useState(new Date().getFullYear());
  const [selectedBalanceEmployeeCode, setSelectedBalanceEmployeeCode] = useState("");
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState("");
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState<BalanceDraft[]>([]);
  const [balanceSaveError, setBalanceSaveError] = useState("");
  const [balanceSaving, setBalanceSaving] = useState(false);
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    const request = isPersonnelMode
      ? employeeApi.me().then((employee) => [employee])
      : employeeApi.search({ status: "ACTIVE", page: 0, size: 500 }).then((employeePage) => employeePage.content);

    request.then((employeeItems) => {
      setEmployees(employeeItems);
      setForm((current) => ({ ...current, employeeId: current.employeeId || employeeItems[0]?.id || 0 }));
      setSelectedEmployeeCode((current) => current || employeeItems[0]?.employeeCode || "");
      setSelectedBalanceEmployeeCode((current) => current || employeeItems[0]?.employeeCode || "");
    });
  }, [isPersonnelMode]);

  const selectedBalanceEmployee = employees.find((employee) => employee.employeeCode === selectedBalanceEmployeeCode);

  const loadBalances = useCallback(() => {
    if (!selectedBalanceEmployee) {
      setBalances([]);
      setBalanceError("");
      return Promise.resolve();
    }
    setBalanceLoading(true);
    setBalanceError("");
    return leaveApi
      .balances({ employeeId: selectedBalanceEmployee.id, year: balanceYear })
      .then(setBalances)
      .catch((apiError) => {
        setBalances([]);
        setBalanceError(getErrorMessage(apiError));
      })
      .finally(() => setBalanceLoading(false));
  }, [balanceYear, selectedBalanceEmployee]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  useEffect(() => {
    if (!modalOpen || !form.employeeId || !form.startDate || !form.endDate || new Date(form.endDate) < new Date(form.startDate)) {
      setLeaveShiftStatus({ loading: false, error: "" });
      return;
    }
    let cancelled = false;
    setLeaveShiftStatus({ loading: true, error: "" });
    shiftAssignmentApi.search({
      employeeId: form.employeeId,
      startDate: form.startDate,
      endDate: form.endDate,
    }).then((assignments) => {
      if (cancelled) return;
      const missingDate = datesBetween(form.startDate, form.endDate).find((date) => !assignments.some((assignment) => assignment.date === date));
      if (missingDate) {
        setLeaveShiftStatus({ loading: false, error: `No shift is assigned on ${missingDate}. Leave can only be applied on assigned shift dates.` });
        return;
      }
      const first = assignments[0];
      const last = assignments[assignments.length - 1];
      const [hours, minutes] = last.startTime.slice(0, 5).split(":").map(Number);
      const endMinutes = hours * 60 + minutes + last.durationHours * 60 + last.durationMinutes;
      const endHour = Math.floor((endMinutes % (24 * 60)) / 60).toString().padStart(2, "0");
      const endMinute = (endMinutes % 60).toString().padStart(2, "0");
      setForm((current) => ({
        ...current,
        startTime: first.startTime.slice(0, 5),
        endTime: `${endHour}:${endMinute}`,
      }));
      setLeaveShiftStatus({ loading: false, error: "" });
    }).catch(() => {
      if (!cancelled) setLeaveShiftStatus({ loading: false, error: "Unable to confirm the employee's shift assignments. Try again." });
    });
    return () => {
      cancelled = true;
    };
  }, [form.employeeId, form.startDate, form.endDate, modalOpen]);

  const loadLeaves = useCallback(() => {
    if (isPersonnelMode && !employees[0]?.id) {
      setLeaves(emptyPage);
      setLoading(false);
      return;
    }
    setLoading(true);
    leaveApi
      .search({
        search: debouncedSearch,
        employeeId: isPersonnelMode ? employees[0]?.id : undefined,
        status: statusFilter ? (statusFilter as LeaveStatus) : undefined,
        page,
        size: 10,
      })
      .then(setLeaves)
      .finally(() => setLoading(false));
  }, [debouncedSearch, employees, isPersonnelMode, page, statusFilter]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  function openCreate() {
    setForm({ ...initialForm, employeeId: employees[0]?.id || 0 });
    setSelectedEmployeeCode(employees[0]?.employeeCode || "");
    setError("");
    setLeaveShiftStatus({ loading: false, error: "" });
    setModalOpen(true);
  }

  function chooseEmployee(employeeCode: string) {
    const employee = employees.find((item) => item.employeeCode === employeeCode);
    setSelectedEmployeeCode(employeeCode);
    setForm({ ...form, employeeId: employee?.id || 0 });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!form.employeeId || !form.reason.trim()) {
      setError("Employee and reason are required.");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError("End date cannot be before start date.");
      return;
    }
    if (leaveShiftStatus.loading) {
      setError("Checking shift assignments. Try again in a moment.");
      return;
    }
    if (leaveShiftStatus.error) {
      setError(leaveShiftStatus.error);
      return;
    }

    try {
      await leaveApi.create(form);
      setModalOpen(false);
      loadLeaves();
      loadBalances();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  function openDecision(leave: LeaveRequest, status: LeaveStatus) {
    setDecision({ leave, status });
    setDecisionComment("");
    setDecisionError("");
  }

  async function submitDecision() {
    if (!decision) return;
    setDecisionLoading(true);
    setDecisionError("");
    try {
      await leaveApi.decide(decision.leave.id, decision.status, decisionComment.trim());
      setDecision(null);
      loadLeaves();
      loadBalances();
    } catch (apiError) {
      setDecisionError(getErrorMessage(apiError));
    } finally {
      setDecisionLoading(false);
    }
  }

  function openBalanceEditor() {
    setBalanceDraft(trackedLeaveTypes.map((leaveType) => {
      const balance = balances.find((item) => item.leaveType === leaveType);
      return {
        leaveType,
        allocatedHours: minutesToHours(balance?.allocatedMinutes || 0),
        carriedForwardHours: minutesToHours(balance?.carriedForwardMinutes || 0),
      };
    }));
    setBalanceSaveError("");
    setBalanceModalOpen(true);
  }

  function updateBalanceDraft(leaveType: BalanceDraft["leaveType"], field: "allocatedHours" | "carriedForwardHours", value: string) {
    setBalanceDraft((current) => current.map((balance) => (
      balance.leaveType === leaveType ? { ...balance, [field]: value } : balance
    )));
  }

  async function saveBalances(event: FormEvent) {
    event.preventDefault();
    if (!selectedBalanceEmployee) return;

    const balancePayload: LeaveBalanceAllocationPayload[] = [];
    for (const balance of balanceDraft) {
      const allocatedMinutes = hoursToMinutes(balance.allocatedHours);
      const carriedForwardMinutes = hoursToMinutes(balance.carriedForwardHours);
      if (allocatedMinutes === null || carriedForwardMinutes === null) {
        setBalanceSaveError("Enter zero or a positive number of hours for every leave type.");
        return;
      }
      balancePayload.push({ leaveType: balance.leaveType, allocatedMinutes, carriedForwardMinutes });
    }

    setBalanceSaving(true);
    setBalanceSaveError("");
    try {
      const updatedBalances = await leaveApi.updateBalances(selectedBalanceEmployee.id, {
        year: balanceYear,
        balances: balancePayload,
      });
      setBalances(updatedBalances);
      setBalanceModalOpen(false);
    } catch (apiError) {
      setBalanceSaveError(getErrorMessage(apiError));
    } finally {
      setBalanceSaving(false);
    }
  }

  const columns: Column<LeaveRequest>[] = [
    {
      header: "Employee",
      cell: (leave) => (
        <div>
          <p className="font-bold text-ink">{leave.employeeName}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">{leave.employeeCode}</p>
        </div>
      ),
    },
    { header: "Type", cell: (leave) => leave.leaveType },
    {
      header: "Dates",
      cell: (leave) => (
        <div>
          <p>
            {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
          </p>
          <p className="text-xs text-ink/45">
            {leave.days} selected day(s)
          </p>
        </div>
      ),
    },
    { header: "Leave hours", cell: (leave) => <span className="font-semibold text-ink">{formatLeaveHours(leave.leaveMinutes)}</span> },
    { header: "Reason", cell: (leave) => leave.reason },
    { header: "Status", cell: (leave) => <Badge value={leave.status} /> },
    {
      header: "Reviewer comment",
      cell: (leave) => (
        <div className="max-w-xs">
          <p className={leave.reviewerComment ? "whitespace-pre-wrap text-sm text-ink" : "text-sm text-ink/40"}>
            {leave.reviewerComment || "No comment"}
          </p>
          {leave.reviewerEmail && <p className="mt-1 text-xs text-ink/45">by {leave.reviewerEmail}</p>}
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (leave) =>
        !isPersonnelMode && leave.status === "PENDING" ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="px-3 text-emerald-700" onClick={() => openDecision(leave, "APPROVED")}>
              <Check size={15} />
            </Button>
            <Button type="button" variant="secondary" className="px-3 text-red-700" onClick={() => openDecision(leave, "REJECTED")}>
              <X size={15} />
            </Button>
            <Button type="button" variant="ghost" className="px-3" onClick={() => openDecision(leave, "CANCELLED")}>
              Cancel
            </Button>
          </div>
        ) : (
          <span className="text-sm text-ink/45">Reviewed</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Time Off</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">
              {isPersonnelMode ? "Apply Leave" : "Leave Management"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {canManageBalances && (
              <Button type="button" variant="secondary" onClick={openBalanceEditor} disabled={!selectedBalanceEmployee}>
                <Pencil size={17} />
                Edit Leave Balances
              </Button>
            )}
            <Button type="button" onClick={openCreate}>
              <Plus size={18} />
              New Leave Request
            </Button>
          </div>
        </div>

        <div className={`mt-6 grid gap-3 ${isPersonnelMode ? "md:grid-cols-[220px]" : "md:grid-cols-[1fr_220px]"}`}>
          {!isPersonnelMode && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
              <Input
                aria-label="Search leave requests"
                placeholder="Search by employee name or code"
                className="pl-11"
                value={search}
                onChange={(event) => {
                  setPage(0);
                  setSearch(event.target.value);
                }}
              />
            </div>
          )}
          <SearchableSelect
            aria-label="Filter by leave status"
            value={statusFilter}
            options={[{ value: "", label: "All statuses" }, ...leaveStatuses.map((status) => ({ value: status, label: status }))]}
            onChange={(value) => {
              setPage(0);
              setStatusFilter(value);
            }}
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Leave Balance</p>
            <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">{balanceYear} time-off summary</h3>
            <p className="mt-2 text-sm text-ink/60">Available balance reserves both approved and pending paid leave. Unpaid leave is not tracked.</p>
          </div>
          <div className={`grid gap-3 ${isPersonnelMode ? "sm:grid-cols-[160px]" : "sm:grid-cols-[minmax(220px,1fr)_160px]"}`}>
            {!isPersonnelMode && (
              <EmployeeAutocomplete
                label="Employee"
                value={selectedBalanceEmployeeCode}
                employees={employees}
                onChange={setSelectedBalanceEmployeeCode}
              />
            )}
            <Input
              label="Leave year"
              type="number"
              min="2000"
              max="2100"
              value={balanceYear}
              onChange={(event) => setBalanceYear(Number(event.target.value) || new Date().getFullYear())}
            />
          </div>
        </div>

        {balanceError && <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{balanceError}</p>}
        {balanceLoading ? (
          <p className="mt-6 text-sm font-semibold text-ink/55">Loading leave balances...</p>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {balances.map((balance) => (
              <div key={balance.leaveType} className="rounded-2xl border border-line bg-mist/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/55">{balance.leaveType}</p>
                  <p className={balance.availableMinutes < 0 ? "text-sm font-extrabold text-red-700" : "text-sm font-extrabold text-fern"}>
                    {formatLeaveHours(balance.availableMinutes)}
                  </p>
                </div>
                <p className="mt-4 text-xs text-ink/50">Available</p>
                <dl className="mt-3 space-y-1.5 text-xs text-ink/65">
                  <div className="flex justify-between gap-3"><dt>Allocated</dt><dd className="font-semibold text-ink">{formatLeaveHours(balance.allocatedMinutes)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Carry-forward</dt><dd className="font-semibold text-ink">{formatLeaveHours(balance.carriedForwardMinutes)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Approved</dt><dd className="font-semibold text-ink">{formatLeaveHours(balance.approvedMinutes)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Pending</dt><dd className="font-semibold text-ink">{formatLeaveHours(balance.pendingMinutes)}</dd></div>
                </dl>
              </div>
            ))}
            {!balances.length && !balanceError && <p className="text-sm text-ink/55">Choose an employee to view leave balances.</p>}
          </div>
        )}
      </Card>

      <DataTable
        rows={leaves.content}
        columns={columns}
        loading={loading}
        page={page}
        totalPages={leaves.totalPages}
        totalElements={leaves.totalElements}
        onPageChange={setPage}
        getRowKey={(leave) => leave.id}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create leave request"
        description="Submitted leave starts as pending until HR, admin, or manager review."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {!isPersonnelMode && (
              <EmployeeAutocomplete
                label="Employee"
                value={selectedEmployeeCode}
                employees={employees}
                onChange={chooseEmployee}
              />
            )}
            <SearchableSelect
              label="Leave Type"
              value={form.leaveType}
              options={leaveTypes.map((type) => ({ value: type, label: type }))}
              onChange={(value) => setForm({ ...form, leaveType: value as LeaveType })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Start Date" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
            <Input label="End Date" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Start Time" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
            <Input label="End Time" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
          </div>
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Leave can only be applied on assigned shift dates and within shift hours. Break time is excluded from leave hours.
          </p>
          {leaveShiftStatus.loading && <p className="text-sm font-semibold text-ink/55">Checking assigned shifts...</p>}
          {leaveShiftStatus.error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{leaveShiftStatus.error}</p>}
          <Textarea label="Reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={leaveShiftStatus.loading || Boolean(leaveShiftStatus.error)}>Submit request</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={balanceModalOpen}
        onClose={() => !balanceSaving && setBalanceModalOpen(false)}
        title={`Edit leave balances for ${selectedBalanceEmployee?.fullName || "employee"}`}
        description={`Set paid leave credits in hours for ${balanceYear}. Pending and approved leave are calculated automatically.`}
      >
        <form onSubmit={saveBalances} className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-line bg-mist/60 text-xs uppercase tracking-[0.12em] text-ink/55">
                <tr><th className="px-4 py-3">Leave type</th><th className="px-4 py-3">Allocated hours</th><th className="px-4 py-3">Carry-forward hours</th></tr>
              </thead>
              <tbody>
                {balanceDraft.map((balance) => (
                  <tr key={balance.leaveType} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-bold text-ink">{balance.leaveType}</td>
                    <td className="px-4 py-3"><Input aria-label={`${balance.leaveType} allocated hours`} type="number" min="0" step="0.01" value={balance.allocatedHours} onChange={(event) => updateBalanceDraft(balance.leaveType, "allocatedHours", event.target.value)} /></td>
                    <td className="px-4 py-3"><Input aria-label={`${balance.leaveType} carry-forward hours`} type="number" min="0" step="0.01" value={balance.carriedForwardHours} onChange={(event) => updateBalanceDraft(balance.leaveType, "carriedForwardHours", event.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {balanceSaveError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{balanceSaveError}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setBalanceModalOpen(false)} disabled={balanceSaving}>Cancel</Button>
            <Button type="submit" disabled={balanceSaving}>{balanceSaving ? "Saving..." : "Save balances"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(decision)}
        onClose={() => !decisionLoading && setDecision(null)}
        title={`${decision?.status ?? ""} leave request`}
        description="Add an optional reviewer comment before confirming this decision."
      >
        <div className="space-y-4">
          <p className="rounded-2xl bg-mist px-4 py-3 text-sm font-semibold text-ink/70">
            {decision?.leave.employeeName} · {decision?.leave.startDate} to {decision?.leave.endDate}
          </p>
          <Textarea label="Reviewer comment" value={decisionComment} onChange={(event) => setDecisionComment(event.target.value)} />
          {decisionError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{decisionError}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setDecision(null)} disabled={decisionLoading}>Cancel</Button>
            <Button type="button" onClick={submitDecision} disabled={decisionLoading}>
              {decisionLoading ? "Saving..." : `Confirm ${decision?.status ?? ""}`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
