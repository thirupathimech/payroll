import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { employeeApi, leaveApi } from "../api/payroll";
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
import { useDebounce } from "../hooks/useDebounce";
import type { Employee, LeavePayload, LeaveRequest, LeaveStatus, LeaveType, PageResponse } from "../types";

const emptyPage: PageResponse<LeaveRequest> = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

const leaveTypes: LeaveType[] = ["ANNUAL", "SICK", "CASUAL", "MATERNITY", "PATERNITY", "UNPAID"];
const leaveStatuses: LeaveStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

const initialForm: LeavePayload = {
  employeeId: 0,
  leaveType: "ANNUAL",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  reason: "",
};

export function LeavePage() {
  const { viewMode } = useAuth();
  const isPersonnelMode = viewMode === "personnel";
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
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    const request = isPersonnelMode
      ? employeeApi.me().then((employee) => [employee])
      : employeeApi.search({ status: "ACTIVE", page: 0, size: 500 }).then((employeePage) => employeePage.content);

    request.then((employeeItems) => {
      setEmployees(employeeItems);
      setForm((current) => ({ ...current, employeeId: current.employeeId || employeeItems[0]?.id || 0 }));
      setSelectedEmployeeCode((current) => current || employeeItems[0]?.employeeCode || "");
    });
  }, [isPersonnelMode]);

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

    try {
      await leaveApi.create(form);
      setModalOpen(false);
      loadLeaves();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  async function decide(leave: LeaveRequest, status: LeaveStatus) {
    const comment = window.prompt(`Add an optional comment for ${status.toLowerCase()} decision`, "");
    if (comment === null) {
      return;
    }
    await leaveApi.decide(leave.id, status, comment);
    loadLeaves();
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
          <p className="text-xs text-ink/45">{leave.days} day(s)</p>
        </div>
      ),
    },
    { header: "Reason", cell: (leave) => leave.reason },
    { header: "Status", cell: (leave) => <Badge value={leave.status} /> },
    {
      header: "Actions",
      cell: (leave) =>
        !isPersonnelMode && leave.status === "PENDING" ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="px-3 text-emerald-700" onClick={() => decide(leave, "APPROVED")}>
              <Check size={15} />
            </Button>
            <Button type="button" variant="secondary" className="px-3 text-red-700" onClick={() => decide(leave, "REJECTED")}>
              <X size={15} />
            </Button>
            <Button type="button" variant="ghost" className="px-3" onClick={() => decide(leave, "CANCELLED")}>
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
          <Button type="button" onClick={openCreate}>
            <Plus size={18} />
            New Leave Request
          </Button>
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
          <Textarea label="Reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
