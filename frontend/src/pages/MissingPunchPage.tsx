import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { attendanceApi } from "../api/payroll";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { Textarea } from "../components/ui/Textarea";
import { useDebounce } from "../hooks/useDebounce";
import { formatDate } from "../lib/format";
import type { MissingPunchPayload, MissingPunchRequest, MissingPunchStatus, PageResponse } from "../types";

const emptyPage: PageResponse<MissingPunchRequest> = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

const missingPunchStatuses: MissingPunchStatus[] = ["PENDING", "APPROVED", "REJECTED"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function initialForm(): MissingPunchPayload {
  return { punchDate: today(), punchTime: "", punchType: "IN", remark: "" };
}

export function MissingPunchPage() {
  const { viewMode } = useAuth();
  const isPersonnelMode = viewMode === "personnel";
  const [requests, setRequests] = useState<PageResponse<MissingPunchRequest>>(emptyPage);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<MissingPunchPayload>(initialForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState<{ request: MissingPunchRequest; status: Exclude<MissingPunchStatus, "PENDING"> } | null>(null);
  const [reviewerComment, setReviewerComment] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [deciding, setDeciding] = useState(false);
  const debouncedSearch = useDebounce(search);

  const loadRequests = useCallback(() => {
    setLoading(true);
    setError("");
    return attendanceApi
      .missingPunchRequests({
        search: isPersonnelMode ? undefined : debouncedSearch,
        status: statusFilter as MissingPunchStatus | "",
        mine: isPersonnelMode,
        page,
        size: 10,
      })
      .then(setRequests)
      .catch((apiError) => {
        setRequests(emptyPage);
        setError(getErrorMessage(apiError));
      })
      .finally(() => setLoading(false));
  }, [debouncedSearch, isPersonnelMode, page, statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  function openCreate() {
    setForm(initialForm());
    setFormError("");
    setCreateOpen(true);
  }

  async function submitRequest(event: FormEvent) {
    event.preventDefault();
    if (!form.punchDate || !form.punchTime || !form.remark.trim()) {
      setFormError("Punch date, punch time, and remark are required.");
      return;
    }
    if (form.punchDate > today()) {
      setFormError("A future punch cannot be requested.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await attendanceApi.createMissingPunchRequest({ ...form, remark: form.remark.trim() });
      setCreateOpen(false);
      setPage(0);
      loadRequests();
    } catch (apiError) {
      setFormError(getErrorMessage(apiError));
    } finally {
      setSaving(false);
    }
  }

  function openDecision(request: MissingPunchRequest, status: Exclude<MissingPunchStatus, "PENDING">) {
    setDecision({ request, status });
    setReviewerComment("");
    setDecisionError("");
  }

  async function submitDecision() {
    if (!decision) return;
    setDeciding(true);
    setDecisionError("");
    try {
      await attendanceApi.decideMissingPunchRequest(decision.request.id, decision.status, reviewerComment.trim());
      setDecision(null);
      loadRequests();
    } catch (apiError) {
      setDecisionError(getErrorMessage(apiError));
    } finally {
      setDeciding(false);
    }
  }

  const columns: Column<MissingPunchRequest>[] = [
    ...(!isPersonnelMode
      ? [{
          header: "Employee",
          cell: (request: MissingPunchRequest) => (
            <div>
              <p className="font-bold text-ink">{request.employeeName}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">{request.employeeCode}</p>
            </div>
          ),
        }]
      : []),
    {
      header: "Missing punch",
      cell: (request) => (
        <div>
          <p className="font-bold text-ink">{formatDate(request.punchDate)} · {request.punchTime.slice(0, 5)}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-fern">{request.punchType} punch</p>
        </div>
      ),
    },
    {
      header: "Remark",
      cell: (request) => <p className="max-w-sm whitespace-pre-wrap text-sm text-ink/75">{request.remark}</p>,
    },
    { header: "Status", cell: (request) => <Badge value={request.status} /> },
    {
      header: "Reviewer",
      cell: (request) => (
        <div className="max-w-xs">
          <p className={request.reviewerComment ? "whitespace-pre-wrap text-sm text-ink/75" : "text-sm text-ink/40"}>
            {request.reviewerComment || (request.status === "PENDING" ? "Awaiting review" : "No comment")}
          </p>
          {request.reviewerEmail && <p className="mt-1 text-xs text-ink/45">by {request.reviewerEmail}</p>}
        </div>
      ),
    },
    ...(!isPersonnelMode
      ? [{
          header: "Actions",
          cell: (request: MissingPunchRequest) => request.status === "PENDING" ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="px-3 text-emerald-700" onClick={() => openDecision(request, "APPROVED")}>
                <Check size={15} /> Approve
              </Button>
              <Button type="button" variant="secondary" className="px-3 text-red-700" onClick={() => openDecision(request, "REJECTED")}>
                <X size={15} /> Reject
              </Button>
            </div>
          ) : <span className="text-sm text-ink/45">Reviewed</span>,
        }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Attendance</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">
              {isPersonnelMode ? "Missing Punch Requests" : "Missing Punch Approval"}
            </h2>
            <p className="mt-2 text-sm text-ink/60">
              {isPersonnelMode
                ? "Request a correction for a missed IN or OUT punch, and track the approval here."
                : "Review missing punch requests and approve or reject them with an optional comment."}
            </p>
          </div>
          {isPersonnelMode && (
            <Button type="button" onClick={openCreate}>
              <Plus size={18} /> New missing punch request
            </Button>
          )}
        </div>

        <div className={`mt-6 grid gap-3 ${isPersonnelMode ? "md:grid-cols-[220px]" : "md:grid-cols-[1fr_220px]"}`}>
          {!isPersonnelMode && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
              <Input
                aria-label="Search missing punch requests"
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
            aria-label="Filter by missing punch request status"
            value={statusFilter}
            options={[{ value: "", label: "All statuses" }, ...missingPunchStatuses.map((status) => ({ value: status, label: status }))]}
            onChange={(value) => {
              setPage(0);
              setStatusFilter(value);
            }}
          />
        </div>
      </Card>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <DataTable
        rows={requests.content}
        columns={columns}
        loading={loading}
        emptyTitle={isPersonnelMode ? "No missing punch requests yet" : "No missing punch requests found"}
        page={requests.page}
        totalPages={requests.totalPages}
        totalElements={requests.totalElements}
        onPageChange={setPage}
        getRowKey={(request) => request.id}
      />

      <Modal
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="New missing punch request"
        description="Select the missed punch, enter its date and time, then explain why it was missed."
      >
        <form className="space-y-4" onSubmit={submitRequest}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Punch date" type="date" max={today()} value={form.punchDate} onChange={(event) => setForm({ ...form, punchDate: event.target.value })} />
            <SearchableSelect
              label="Missing punch"
              value={form.punchType}
              options={[{ value: "IN", label: "IN punch" }, { value: "OUT", label: "OUT punch" }]}
              onChange={(value) => setForm({ ...form, punchType: value as MissingPunchPayload["punchType"] })}
            />
            <Input label="Punch time" type="time" value={form.punchTime} onChange={(event) => setForm({ ...form, punchTime: event.target.value })} />
          </div>
          <Textarea label="Remark" maxLength={800} placeholder="Explain why this punch was missed" value={form.remark} onChange={(event) => setForm({ ...form, remark: event.target.value })} />
          {formError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{formError}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Submitting..." : "Submit request"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(decision)}
        onClose={() => !deciding && setDecision(null)}
        title={`${decision?.status === "APPROVED" ? "Approve" : "Reject"} missing punch request`}
        description={decision?.status === "APPROVED" ? "Approval will add the requested punch to attendance." : "Add an optional comment before confirming this decision."}
      >
        <div className="space-y-4">
          <p className="rounded-2xl bg-mist px-4 py-3 text-sm font-semibold text-ink/70">
            {decision?.request.employeeName} · {decision?.request.punchType} · {decision?.request.punchDate} {decision?.request.punchTime.slice(0, 5)}
          </p>
          <Textarea label="Reviewer comment" maxLength={800} value={reviewerComment} onChange={(event) => setReviewerComment(event.target.value)} />
          {decisionError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{decisionError}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setDecision(null)} disabled={deciding}>Cancel</Button>
            <Button type="button" onClick={submitDecision} disabled={deciding}>
              {deciding ? "Saving..." : `Confirm ${decision?.status === "APPROVED" ? "approval" : "rejection"}`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
