import { FormEvent, useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Search, UserCog } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { employeeApi, userApi } from "../api/payroll";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type Column } from "../components/ui/DataTable";
import { EmployeeAutocomplete } from "../components/ui/EmployeeAutocomplete";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import type { AppUser, AppUserPayload, Employee, PageResponse, RoleName } from "../types";

interface UserForm {
  username: string;
  employeeCode: string;
  role: RoleName;
  enabled: boolean;
}

const initialForm: UserForm = {
  username: "",
  employeeCode: "",
  role: "EMPLOYEE",
  enabled: true,
};

const emptyPage: PageResponse<AppUser> = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

const roles: RoleName[] = ["ADMIN", "HR", "MANAGER", "LEAD", "EMPLOYEE"];

function toPayload(form: UserForm): AppUserPayload {
  return {
    username: form.username.trim(),
    employeeCode: form.employeeCode.trim().toUpperCase(),
    role: form.role,
    enabled: form.enabled,
  };
}

export function UsersPage() {
  const [users, setUsers] = useState(emptyPage);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserForm>(initialForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = useCallback((nextPage = page, nextSearch = search, nextStatusFilter = statusFilter) => {
    setLoading(true);
    userApi
      .search({
        search: nextSearch.trim() || undefined,
        enabled: nextStatusFilter ? nextStatusFilter === "ACTIVE" : undefined,
        page: nextPage,
        size: 10,
      })
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => {
    employeeApi.search({ page: 0, size: 1000 }).then((employeePage) => setEmployees(employeePage.content));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
 

  function openCreate() {
    setEditing(null);
    setForm(initialForm);
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function openEdit(user: AppUser) {
    setEditing(user);
    setForm({
      username: user.username,
      employeeCode: user.employeeCode,
      role: user.role,
      enabled: user.enabled,
    });
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.username.trim() || !form.employeeCode.trim()) {
      setError("Username and employee code are required.");
      return;
    }

    try {
      if (editing) {
        await userApi.update(editing.id, toPayload(form));
        setMessage("User updated successfully.");
      } else {
        await userApi.create(toPayload(form));
        setMessage("User created with default password Pass@1234.");
      }
      setModalOpen(false);
      loadUsers();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  async function resetPassword(user: AppUser) {
    if (!window.confirm(`Reset password for ${user.username} to Pass@1234?`)) {
      return;
    }
    try {
      const response = await userApi.resetPassword(user.id);
      setMessage(response.message);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  const columns: Column<AppUser>[] = [
    {
      header: "User",
      cell: (user) => (
        <div>
          <p className="font-bold text-ink">{user.username}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">{user.employeeCode}</p>
        </div>
      ),
    },
    { header: "Employee", cell: (user) => user.fullName },
    { header: "Role", cell: (user) => user.role },
    { header: "Status", cell: (user) => <Badge value={user.enabled ? "ACTIVE" : "INACTIVE"} /> },
    {
      header: "Actions",
      cell: (user) => (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="px-3" onClick={() => openEdit(user)}>
            <UserCog size={15} />
          </Button>
          <Button type="button" variant="secondary" className="px-3" onClick={() => resetPassword(user)}>
            <KeyRound size={15} />
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
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Access</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Users</h2>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus size={18} />
            New User
          </Button>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
            <Input
              aria-label="Search users"
              placeholder="Search by username, employee code, or name"
              className="pl-11"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <SearchableSelect
            aria-label="Filter by status"
            value={statusFilter}
            options={[
              { value: "", label: "All statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
            onChange={setStatusFilter}
          />
        </div>

        <div className="mt-4 flex gap-3">
          <Button type="button" variant="secondary" onClick={() => { setPage(0); loadUsers(0); }}>
            Search
          </Button>
        </div>
      </Card>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}

      <DataTable
        rows={users.content}
        columns={columns}
        loading={loading}
        page={page}
        totalPages={users.totalPages}
        totalElements={users.totalElements}
        onPageChange={setPage}
        getRowKey={(user) => user.id}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit user" : "Create user"}
        description="User accounts are created against employee codes and start with the default password."
      >
        <form onSubmit={saveUser} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Username"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase() })}
            />
            <Input label="Default Password" value="Pass@1234" disabled />
          </div>

          <EmployeeAutocomplete
            label="Employee Code"
            value={form.employeeCode}
            employees={employees}
            onChange={(employeeCode) => setForm({ ...form, employeeCode })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <SearchableSelect
              label="Role"
              value={form.role}
              options={roles.map((role) => ({ value: role, label: role }))}
              onChange={(value) => setForm({ ...form, role: value as RoleName })}
            />
            <SearchableSelect
              label="Status"
              value={String(form.enabled)}
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
              onChange={(value) => setForm({ ...form, enabled: value === "true" })}
            />
          </div>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save user" : "Create user"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
