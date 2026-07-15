import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Search } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { branchApi } from "../api/payroll";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { formatDate } from "../lib/format";
import type { Branch, BranchPayload } from "../types";

type BranchForm = {
  name: string;
  code: string;
};

const initialForm: BranchForm = {
  name: "",
  code: "",
};

function toPayload(form: BranchForm): BranchPayload {
  return {
    name: form.name.trim(),
    code: form.code.trim() ? form.code.trim().toUpperCase() : undefined,
  };
}

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchForm>(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadBranches = useCallback(() => {
    setLoading(true);
    branchApi
      .active()
      .then(setBranches)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const filteredBranches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return branches;
    }
    return branches.filter((branch) => {
      return (
        branch.name.toLowerCase().includes(term) ||
        branch.code?.toLowerCase().includes(term) ||
        formatDate(branch.updatedAt).toLowerCase().includes(term)
      );
    });
  }, [branches, search]);

  function openCreate() {
    setEditing(null);
    setForm(initialForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setForm({
      name: branch.name,
      code: branch.code ?? "",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) {
      return;
    }
    setError("");

    if (!form.name.trim()) {
      setError("Branch name is required.");
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        await branchApi.update(editing.id, toPayload(form));
      } else {
        await branchApi.create(toPayload(form));
      }
      setModalOpen(false);
      loadBranches();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Branch>[] = [
    {
      header: "Branch",
      cell: (branch) => (
        <div>
          <p className="font-bold text-ink">{branch.name}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">#{branch.id}</p>
        </div>
      ),
    },
    { header: "Code", cell: (branch) => branch.code || "-" },
    { header: "Status", cell: (branch) => <Badge value={branch.active} /> },
    { header: "Updated", cell: (branch) => formatDate(branch.updatedAt) },
    {
      header: "Actions",
      cell: (branch) => (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="px-3" onClick={() => openEdit(branch)}>
            <Edit3 size={15} />
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
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Branches</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
              Manage branch names and codes here. The main branch is created automatically for every organization.
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus size={18} />
            New Branch
          </Button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
            <Input
              aria-label="Search branches"
              placeholder="Search by branch name or code"
              className="pl-11"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </Card>

      <DataTable
        rows={filteredBranches}
        columns={columns}
        loading={loading}
        emptyTitle="No branches found"
        page={0}
        totalPages={filteredBranches.length > 0 ? 1 : 0}
        totalElements={filteredBranches.length}
        onPageChange={() => undefined}
        getRowKey={(branch) => branch.id}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit branch" : "Create branch"}
        description="Branch names are used across employee records, so keep them clear and consistent."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Branch Name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <Input
              label="Branch Code"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
            />
          </div>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Create branch"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
