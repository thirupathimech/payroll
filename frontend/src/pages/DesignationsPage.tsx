import { FormEvent, useCallback, useEffect, useState } from "react";
import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { departmentApi, designationApi } from "../api/payroll";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { useDebounce } from "../hooks/useDebounce";
import type { Department, Designation, DesignationPayload, PageResponse } from "../types";

const emptyPage: PageResponse<Designation> = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

const initialForm: DesignationPayload = {
  title: "",
  code: "",
  description: "",
  departmentId: 0,
  active: true,
};

export function DesignationsPage() {
  const [designations, setDesignations] = useState(emptyPage);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Designation | null>(null);
  const [form, setForm] = useState<DesignationPayload>(initialForm);
  const [error, setError] = useState("");
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    departmentApi.active().then((items) => {
      setDepartments(items);
      setForm((current) => ({ ...current, departmentId: current.departmentId || items[0]?.id || 0 }));
    });
  }, []);

  const loadDesignations = useCallback(() => {
    setLoading(true);
    designationApi
      .search({
        search: debouncedSearch,
        departmentId: departmentFilter ? Number(departmentFilter) : undefined,
        page,
        size: 10,
      })
      .then(setDesignations)
      .finally(() => setLoading(false));
  }, [debouncedSearch, departmentFilter, page]);

  useEffect(() => {
    loadDesignations();
  }, [loadDesignations]);

  function openCreate() {
    setEditing(null);
    setForm({ ...initialForm, departmentId: departments[0]?.id || 0 });
    setError("");
    setModalOpen(true);
  }

  function openEdit(designation: Designation) {
    setEditing(designation);
    setForm({
      title: designation.title,
      code: designation.code,
      description: designation.description ?? "",
      departmentId: designation.departmentId,
      active: designation.active,
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.title.trim() || !form.code.trim() || !form.departmentId) {
      setError("Title, code, and department are required.");
      return;
    }

    try {
      if (editing) {
        await designationApi.update(editing.id, form);
      } else {
        await designationApi.create(form);
      }
      setModalOpen(false);
      loadDesignations();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  async function deactivate(id: number) {
    if (!window.confirm("Deactivate this designation?")) {
      return;
    }
    await designationApi.deactivate(id);
    loadDesignations();
  }

  const columns: Column<Designation>[] = [
    {
      header: "Designation",
      cell: (designation) => (
        <div>
          <p className="font-bold text-ink">{designation.title}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">{designation.code}</p>
        </div>
      ),
    },
    { header: "Department", cell: (designation) => designation.departmentName },
    { header: "Status", cell: (designation) => <Badge value={designation.active} /> },
    {
      header: "Actions",
      cell: (designation) => (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="px-3" onClick={() => openEdit(designation)}>
            <Edit3 size={15} />
          </Button>
          <Button type="button" variant="danger" className="px-3" onClick={() => deactivate(designation.id)}>
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
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Roles</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Designations</h2>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus size={18} />
            New Designation
          </Button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
            <Input
              aria-label="Search designations"
              placeholder="Search by title or code"
              className="pl-11"
              value={search}
              onChange={(event) => {
                setPage(0);
                setSearch(event.target.value);
              }}
            />
          </div>
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
        rows={designations.content}
        columns={columns}
        loading={loading}
        page={page}
        totalPages={designations.totalPages}
        totalElements={designations.totalElements}
        onPageChange={setPage}
        getRowKey={(designation) => designation.id}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit designation" : "Create designation"}
        description="Each designation is attached to a department for cleaner employee reporting."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            <Input label="Code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
          </div>
          <Select
            label="Department"
            value={form.departmentId}
            onChange={(event) => setForm({ ...form, departmentId: Number(event.target.value) })}
          >
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
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
            <Button type="submit">{editing ? "Save changes" : "Create designation"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
