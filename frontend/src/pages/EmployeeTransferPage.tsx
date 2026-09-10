import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { branchApi, employeeApi, employeeTransferApi } from "../api/payroll";
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
import type { Branch, Employee, EmployeeTransferPayload, EmployeeTransferRequest, EmployeeTransferStatus, PageResponse } from "../types";

const emptyPage: PageResponse<EmployeeTransferRequest> = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true };
const statuses: EmployeeTransferStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];
const today = () => new Date().toISOString().slice(0, 10);
const initialForm = (): EmployeeTransferPayload => ({ toBranchId: 0, effectiveDate: today(), reason: "" });

export function EmployeeTransferPage() {
  const { viewMode, user } = useAuth();
  const personnel = viewMode === "personnel";
  const canApprove = user?.role === "ADMIN" || user?.role === "HR";
  const [requests, setRequests] = useState<PageResponse<EmployeeTransferRequest>>(emptyPage);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | EmployeeTransferStatus>("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<EmployeeTransferPayload>(initialForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState<{ request: EmployeeTransferRequest; status: "APPROVED" | "REJECTED" } | null>(null);
  const [comment, setComment] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const debouncedSearch = useDebounce(search);

  const load = useCallback(() => {
    setLoading(true); setError("");
    return employeeTransferApi.search({ search: personnel ? undefined : debouncedSearch, status, mine: personnel, page, size: 10 })
      .then(setRequests).catch((apiError) => { setRequests(emptyPage); setError(getErrorMessage(apiError)); }).finally(() => setLoading(false));
  }, [debouncedSearch, page, personnel, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    branchApi.active().then(setBranches).catch(() => setBranches([]));
    if (!personnel) employeeApi.search({ page: 0, size: 200 }).then((result) => setEmployees(result.content)).catch(() => setEmployees([]));
  }, [personnel]);

  function openCreate() { setForm(initialForm()); setFormError(""); setCreateOpen(true); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if ((!personnel && !form.employeeId) || !form.toBranchId || !form.effectiveDate || !form.reason.trim()) {
      setFormError("Choose the employee and destination branch, then provide an effective date and reason."); return;
    }
    if (form.effectiveDate < today()) { setFormError("Transfer effective date cannot be in the past."); return; }
    setSaving(true); setFormError("");
    try { await employeeTransferApi.create({ ...form, reason: form.reason.trim() }); setCreateOpen(false); setPage(0); load(); }
    catch (apiError) { setFormError(getErrorMessage(apiError)); } finally { setSaving(false); }
  }
  async function submitDecision() {
    if (!decision) return; setDeciding(true); setDecisionError("");
    try { await employeeTransferApi.decide(decision.request.id, decision.status, comment.trim()); setDecision(null); load(); }
    catch (apiError) { setDecisionError(getErrorMessage(apiError)); } finally { setDeciding(false); }
  }
  async function cancel(request: EmployeeTransferRequest) {
    try { await employeeTransferApi.cancel(request.id); load(); } catch (apiError) { setError(getErrorMessage(apiError)); }
  }

  const columns: Column<EmployeeTransferRequest>[] = [
    ...(!personnel ? [{ header: "Employee", cell: (request: EmployeeTransferRequest) => <div><p className="font-bold text-ink">{request.employeeName}</p><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{request.employeeCode}</p></div> }] : []),
    { header: "From branch", cell: (request) => <span className="font-semibold text-ink">{request.fromBranchName}</span> },
    { header: "To branch", cell: (request) => <span className="font-semibold text-ink">{request.toBranchName}</span> },
    { header: "Effective date", cell: (request) => <span className="font-semibold text-ink">{formatDate(request.effectiveDate)}</span> },
    { header: "Reason", cell: (request) => <p className="max-w-xs whitespace-pre-wrap text-sm">{request.reason}</p> },
    { header: "Status", cell: (request) => <div className="space-y-1"><Badge value={request.status} />{request.appliedAt && <p className="text-xs text-emerald-700">Applied {formatDate(request.effectiveDate)}</p>}</div> },
    { header: "Review", cell: (request) => <div className="max-w-xs text-sm"><p className={request.reviewerComment ? "whitespace-pre-wrap" : "text-ink/40"}>{request.reviewerComment || (request.status === "PENDING" ? "Awaiting HR review" : "No comment")}</p>{request.reviewerEmail && <p className="mt-1 text-xs text-ink/45">by {request.reviewerEmail}</p>}</div> },
    { header: "Actions", cell: (request) => request.status === "PENDING" ? <div className="flex flex-wrap gap-2">{canApprove && <><Button type="button" variant="secondary" className="px-3 text-emerald-700" onClick={() => { setDecision({ request, status: "APPROVED" }); setComment(""); setDecisionError(""); }}><Check size={15} />Approve</Button><Button type="button" variant="secondary" className="px-3 text-red-700" onClick={() => { setDecision({ request, status: "REJECTED" }); setComment(""); setDecisionError(""); }}><X size={15} />Reject</Button></>}{(personnel || request.requestedByEmail === user?.email) && <Button type="button" variant="secondary" className="px-3" onClick={() => void cancel(request)}>Cancel</Button>}</div> : <span className="text-sm text-ink/45">—</span> },
  ];

  return <div className="space-y-6">
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Employee movement</p><h2 className="mt-2 font-display text-3xl font-extrabold text-ink">{personnel ? "My Transfer Requests" : "Employee Transfer Requests"}</h2><p className="mt-2 max-w-3xl text-sm text-ink/60">{personnel ? "Request a branch move and track the HR decision. An approved transfer takes effect only on its effective date." : "Review branch-transfer requests with an effective date. Locked payroll dates cannot be changed."}</p></div><Button type="button" onClick={openCreate}><Plus size={18} />New transfer request</Button></div>
      <div className={`mt-6 grid gap-3 ${personnel ? "md:grid-cols-[220px]" : "md:grid-cols-[1fr_220px]"}`}>{!personnel && <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} /><Input aria-label="Search transfer requests" className="pl-11" placeholder="Search employee name or code" value={search} onChange={(event) => { setPage(0); setSearch(event.target.value); }} /></div>}<SearchableSelect value={status} aria-label="Filter transfer status" options={[{ value: "", label: "All statuses" }, ...statuses.map((value) => ({ value, label: value }))]} onChange={(value) => { setPage(0); setStatus(value as "" | EmployeeTransferStatus); }} /></div>
    </Card>
    {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
    <DataTable rows={requests.content} columns={columns} loading={loading} emptyTitle={personnel ? "No transfer requests yet" : "No transfer requests found"} page={requests.page} totalPages={requests.totalPages} totalElements={requests.totalElements} onPageChange={setPage} getRowKey={(request) => request.id} />
    <Modal open={createOpen} onClose={() => !saving && setCreateOpen(false)} title="New branch transfer request" description="The selected branch is applied only after HR approval and on the stated effective date."><form className="space-y-4" onSubmit={submit}>{!personnel && <SearchableSelect label="Employee" value={String(form.employeeId || "")} options={employees.map((employee) => ({ value: String(employee.id), label: `${employee.employeeCode} — ${employee.fullName}` }))} onChange={(value) => setForm({ ...form, employeeId: Number(value) || undefined })} />}<div className="grid gap-4 md:grid-cols-2"><SearchableSelect label="Destination branch" value={String(form.toBranchId || "")} options={[{ value: "", label: "Select branch" }, ...branches.map((branch) => ({ value: String(branch.id), label: `${branch.name}${branch.code ? ` (${branch.code})` : ""}` }))]} onChange={(value) => setForm({ ...form, toBranchId: Number(value) })} /><Input label="Effective date" type="date" min={today()} value={form.effectiveDate} onChange={(event) => setForm({ ...form, effectiveDate: event.target.value })} /></div><Textarea label="Business reason" maxLength={800} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />{formError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{formError}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Submitting..." : "Submit request"}</Button></div></form></Modal>
    <Modal open={Boolean(decision)} onClose={() => !deciding && setDecision(null)} title={`${decision?.status === "APPROVED" ? "Approve" : "Reject"} transfer request`} description={decision?.status === "APPROVED" ? "The employee moves on the effective date; payroll history remains unchanged." : "Add an optional comment before confirming the rejection."}><div className="space-y-4"><p className="rounded-2xl bg-mist px-4 py-3 text-sm font-semibold text-ink/70">{decision?.request.employeeName} · {decision?.request.fromBranchName} → {decision?.request.toBranchName} · {decision && formatDate(decision.request.effectiveDate)}</p><Textarea label="Reviewer comment" maxLength={800} value={comment} onChange={(event) => setComment(event.target.value)} />{decisionError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{decisionError}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setDecision(null)} disabled={deciding}>Cancel</Button><Button type="button" onClick={() => void submitDecision()} disabled={deciding}>{deciding ? "Saving..." : `Confirm ${decision?.status === "APPROVED" ? "approval" : "rejection"}`}</Button></div></div></Modal>
  </div>;
}
