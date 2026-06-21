import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { departmentApi, designationApi, employeeApi } from "../api/payroll";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { formatCurrency, formatDate } from "../lib/format";
import { useDebounce } from "../hooks/useDebounce";
import type {
  Department,
  Designation,
  Employee,
  EmployeePayload,
  EmploymentStatus,
  PageResponse,
} from "../types";

type EmployeeForm = Omit<EmployeePayload, "baseSalary" | "departmentId" | "designationId"> & {
  baseSalary: string;
  departmentId: number;
  designationId: number;
};

const emptyPage: PageResponse<Employee> = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

const initialForm: EmployeeForm = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  joiningDate: new Date().toISOString().slice(0, 10),
  baseSalary: "",
  bankAccountNumber: "",
  taxIdentificationNumber: "",
  address: "",
  status: "ACTIVE",
  departmentId: 0,
  designationId: 0,
};

const statuses: EmploymentStatus[] = ["ACTIVE", "ON_LEAVE", "PROBATION", "TERMINATED"];

export function EmployeesPage() {
  const [employees, setEmployees] = useState(emptyPage);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(initialForm);
  const [error, setError] = useState("");
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    Promise.all([
      departmentApi.active(),
      designationApi.search({ active: true, page: 0, size: 500 }),
    ]).then(([departmentItems, designationPage]) => {
      setDepartments(departmentItems);
      setDesignations(designationPage.content);
      const departmentId = departmentItems[0]?.id || 0;
      const designationId =
        designationPage.content.find((designation) => designation.departmentId === departmentId)?.id ||
        designationPage.content[0]?.id ||
        0;
      setForm((current) => ({ ...current, departmentId, designationId }));
    });
  }, []);

  const loadEmployees = useCallback(() => {
    setLoading(true);
    employeeApi
      .search({
        search: debouncedSearch,
        status: statusFilter ? (statusFilter as EmploymentStatus) : undefined,
        departmentId: departmentFilter ? Number(departmentFilter) : undefined,
        page,
        size: 10,
      })
      .then(setEmployees)
      .finally(() => setLoading(false));
  }, [debouncedSearch, departmentFilter, page, statusFilter]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const filteredDesignations = useMemo(
    () => designations.filter((designation) => designation.departmentId === form.departmentId),
    [designations, form.departmentId],
  );

  function openCreate() {
    const departmentId = departments[0]?.id || 0;
    const designationId =
      designations.find((designation) => designation.departmentId === departmentId)?.id || designations[0]?.id || 0;
    setEditing(null);
    setForm({ ...initialForm, departmentId, designationId });
    setError("");
    setModalOpen(true);
  }

  function openEdit(employee: Employee) {
    setEditing(employee);
    setForm({
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone ?? "",
      dateOfBirth: employee.dateOfBirth ?? "",
      joiningDate: employee.joiningDate,
      baseSalary: String(employee.baseSalary),
      bankAccountNumber: employee.bankAccountNumber ?? "",
      taxIdentificationNumber: employee.taxIdentificationNumber ?? "",
      address: employee.address ?? "",
      status: employee.status,
      departmentId: employee.departmentId,
      designationId: employee.designationId,
    });
    setError("");
    setModalOpen(true);
  }

  function updateDepartment(departmentId: number) {
    const designationId =
      designations.find((designation) => designation.departmentId === departmentId)?.id || form.designationId;
    setForm({ ...form, departmentId, designationId });
  }

  function toPayload(): EmployeePayload {
    return {
      ...form,
      baseSalary: Number(form.baseSalary),
      dateOfBirth: form.dateOfBirth || undefined,
      phone: form.phone || undefined,
      bankAccountNumber: form.bankAccountNumber || undefined,
      taxIdentificationNumber: form.taxIdentificationNumber || undefined,
      address: form.address || undefined,
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!form.employeeCode.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError("Code, first name, last name, and email are required.");
      return;
    }
    if (!form.departmentId || !form.designationId) {
      setError("Department and designation are required.");
      return;
    }
    if (!form.baseSalary || Number(form.baseSalary) <= 0) {
      setError("Base salary must be greater than zero.");
      return;
    }

    try {
      const payload = toPayload();
      if (editing) {
        await employeeApi.update(editing.id, payload);
      } else {
        await employeeApi.create(payload);
      }
      setModalOpen(false);
      loadEmployees();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  async function terminate(id: number) {
    if (!window.confirm("Mark this employee as terminated?")) {
      return;
    }
    await employeeApi.terminate(id);
    loadEmployees();
  }

  const columns: Column<Employee>[] = [
    {
      header: "Employee",
      cell: (employee) => (
        <div>
          <p className="font-bold text-ink">{employee.fullName}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">{employee.employeeCode}</p>
        </div>
      ),
    },
    {
      header: "Contact",
      cell: (employee) => (
        <div>
          <p>{employee.email}</p>
          <p className="text-xs text-ink/45">{employee.phone || "No phone"}</p>
        </div>
      ),
    },
    { header: "Department", cell: (employee) => employee.departmentName },
    { header: "Designation", cell: (employee) => employee.designationTitle },
    { header: "Salary", cell: (employee) => formatCurrency(employee.baseSalary) },
    { header: "Joined", cell: (employee) => formatDate(employee.joiningDate) },
    { header: "Status", cell: (employee) => <Badge value={employee.status} /> },
    {
      header: "Actions",
      cell: (employee) => (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="px-3" onClick={() => openEdit(employee)}>
            <Edit3 size={15} />
          </Button>
          <Button type="button" variant="danger" className="px-3" onClick={() => terminate(employee.id)}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">People</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Employees</h2>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus size={18} />
            New Employee
          </Button>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_210px_240px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
            <Input
              aria-label="Search employees"
              placeholder="Search by name, code, or email"
              className="pl-11"
              value={search}
              onChange={(event) => {
                setPage(0);
                setSearch(event.target.value);
              }}
            />
          </div>
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => {
              setPage(0);
              setStatusFilter(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by department"
            value={departmentFilter}
            onChange={(event) => {
              setPage(0);
              setDepartmentFilter(event.target.value);
            }}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <DataTable
        rows={employees.content}
        columns={columns}
        loading={loading}
        page={page}
        totalPages={employees.totalPages}
        totalElements={employees.totalElements}
        onPageChange={setPage}
        getRowKey={(employee) => employee.id}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit employee" : "Create employee"}
        description="Employee data powers payroll, leave, and reporting workflows."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Employee Code" value={form.employeeCode} onChange={(event) => setForm({ ...form, employeeCode: event.target.value })} />
            <Input label="First Name" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
            <Input label="Last Name" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
            <Input label="Joining Date" type="date" value={form.joiningDate} onChange={(event) => setForm({ ...form, joiningDate: event.target.value })} />
            <Input label="Base Salary" type="number" min="1" value={form.baseSalary} onChange={(event) => setForm({ ...form, baseSalary: event.target.value })} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Select label="Department" value={form.departmentId} onChange={(event) => updateDepartment(Number(event.target.value))}>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
            <Select
              label="Designation"
              value={form.designationId}
              onChange={(event) => setForm({ ...form, designationId: Number(event.target.value) })}
            >
              {filteredDesignations.map((designation) => (
                <option key={designation.id} value={designation.id}>
                  {designation.title}
                </option>
              ))}
            </Select>
            <Select
              label="Status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as EmploymentStatus })}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Bank Account Number"
              value={form.bankAccountNumber}
              onChange={(event) => setForm({ ...form, bankAccountNumber: event.target.value })}
            />
            <Input
              label="Tax Identification Number"
              value={form.taxIdentificationNumber}
              onChange={(event) => setForm({ ...form, taxIdentificationNumber: event.target.value })}
            />
          </div>
          <Textarea label="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save changes" : "Create employee"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
