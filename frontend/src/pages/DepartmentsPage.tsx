import { FormEvent, useCallback, useEffect, useState } from "react";
import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { departmentApi } from "../api/payroll";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { useDebounce } from "../hooks/useDebounce";
import type { Department, DepartmentPayload, PageResponse } from "../types";

const emptyPage: PageResponse<Department> = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

const initialForm: DepartmentPayload = {
  name: "",
  code: "",
  description: "",
  active: true,
};

export function DepartmentsPage() {
  const [departments, setDepartments] = useState(emptyPage);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState<DepartmentPayload>(initialForm);
  const [error, setError] = useState("");
  const debouncedSearch = useDebounce(search);

  const loadDepartments = useCallback(() => {
    setLoading(true);
    departmentApi
      .search({
        search: debouncedSearch,
        active: activeFilter === "" ? undefined : activeFilter === "true",
        page,
        size: 10,
      })
      .then(setDepartments)
      .finally(() => setLoading(false));
  }, [activeFilter, debouncedSearch, page]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  function openCreate() {
    setEditing(null);
    setForm(initialForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(department: Department) {
    setEditing(department);
    setForm({
      name: department.name,
      code: department.code,
      description: department.description ?? "",
      active: department.active,
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.code.trim()) {
      setError("Department name and code are required.");
      return;
    }

    try {
      if (editing) {
        await departmentApi.update(editing.id, form);
      } else {
        await departmentApi.create(form);
      }
      setModalOpen(false);
      loadDepartments();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  async function deactivate(id: number) {
    if (!window.confirm("Deactivate this department?")) {
      return;
    }
    await departmentApi.deactivate(id);
    loadDepartments();
  }

  const columns: Column<Department>[] = [
    {
      header: "Department",
      cell: (department) => (
        <div>
          <p className="font-bold text-ink">{department.name}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">{department.code}</p>
        </div>
      ),
    },
    { header: "Description", cell: (department) => department.description || "-" },
    { header: "Status", cell: (department) => <Badge value={department.active} /> },
    {
      header: "Actions",
      cell: (department) => (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="px-3" onClick={() => openEdit(department)}>
            <Edit3 size={15} />
          </Button>
          <Button type="button" variant="danger" className="px-3" onClick={() => deactivate(department.id)}>
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
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Organization</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Departments</h2>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus size={18} />
            New Department
          </Button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
            <Input
              aria-label="Search departments"
              placeholder="Search by department name or code"
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
            value={activeFilter}
            onChange={(event) => {
              setPage(0);
              setActiveFilter(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>
      </Card>

      <DataTable
        rows={departments.content}
        columns={columns}
        loading={loading}
        page={page}
        totalPages={departments.totalPages}
        totalElements={departments.totalElements}
        onPageChange={setPage}
        getRowKey={(department) => department.id}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit department" : "Create department"}
        description="Keep department codes short and stable because they are used in employee records."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <Input label="Code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <Select
            label="Status"
            value={String(form.active)}
            onChange={(event) => setForm({ ...form, active: event.target.value === "true" })}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save changes" : "Create department"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
