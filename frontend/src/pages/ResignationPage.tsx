import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { employeeApi, resignationApi } from "../api/payroll";
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
import type { Employee, PageResponse, ResignationPayload, ResignationRequest, ResignationStatus } from "../types";

const emptyPage: PageResponse<ResignationRequest> = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true };
const statuses: ResignationStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];
const today = () => new Date().toISOString().slice(0, 10);
const initialForm = (): ResignationPayload => ({ proposedLastWorkingDate: today(), reason: "" });

export function ResignationPage() {
  const { viewMode, user } = useAuth();
  const personnel = viewMode === "personnel";
  const canApprove = user?.role === "ADMIN" || user?.role === "HR";
  const [requests, setRequests] = useState<PageResponse<ResignationRequest>>(emptyPage);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | ResignationStatus>("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<ResignationPayload>(initialForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState<{ request: ResignationRequest; status: "APPROVED" | "REJECTED" } | null>(null);
  const [approvedLastWorkingDate, setApprovedLastWorkingDate] = useState("");
  const [relievingDate, setRelievingDate] = useState("");
  const [comment, setComment] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const debouncedSearch = useDebounce(search);

  const load = useCallback(() => {
    setLoading(true); setError("");
    return resignationApi.search({ search: personnel ? undefined : debouncedSearch, status, mine: personnel, page, size: 10 })
      .then(setRequests).catch((apiError) => { setRequests(emptyPage); setError(getErrorMessage(apiError)); }).finally(() => setLoading(false));
  }, [debouncedSearch, page, personnel, status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!personnel) employeeApi.search({ page: 0, size: 200 }).then((result) => setEmployees(result.content)).catch(() => setEmployees([])); }, [personnel]);

  function openCreate() { setForm(initialForm()); setFormError(""); setCreateOpen(true); }
  function openDecision(request: ResignationRequest, nextStatus: "APPROVED" | "REJECTED") { setDecision({ request, status: nextStatus }); setApprovedLastWorkingDate(request.proposedLastWorkingDate); setRelievingDate(request.proposedLastWorkingDate); setComment(""); setDecisionError(""); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if ((!personnel && !form.employeeId) || !form.proposedLastWorkingDate || !form.reason.trim()) { setFormError("Choose the employee, proposed last working date, and a reason."); return; }
    if (form.proposedLastWorkingDate < today()) { setFormError("Proposed last working date cannot be in the past."); return; }
    setSaving(true); setFormError("");
    try { await resignationApi.create({ ...form, reason: form.reason.trim() }); setCreateOpen(false); setPage(0); load(); }
    catch (apiError) { setFormError(getErrorMessage(apiError)); } finally { setSaving(false); }
  }
  async function submitDecision() {
    if (!decision) return;
    if (decision.status === "APPROVED" && (!approvedLastWorkingDate || (relievingDate && relievingDate < approvedLastWorkingDate))) { setDecisionError("Enter a final last working date; relieving date cannot be earlier."); return; }
    setDeciding(true); setDecisionError("");
    try { await resignationApi.decide(decision.request.id, { status: decision.status, approvedLastWorkingDate: decision.status === "APPROVED" ? approvedLastWorkingDate : undefined, relievingDate: decision.status === "APPROVED" ? relievingDate || undefined : undefined, reviewerComment: comment.trim() }); setDecision(null); load(); }
    catch (apiError) { setDecisionError(getErrorMessage(apiError)); } finally { setDeciding(false); }
  }
  async function cancel(request: ResignationRequest) { try { await resignationApi.cancel(request.id); load(); } catch (apiError) { setError(getErrorMessage(apiError)); } }

  const columns: Column<ResignationRequest>[] = [
    ...(!personnel ? [{ header: "Employee", cell: (request: ResignationRequest) => <div><p className="font-bold text-ink">{request.employeeName}</p><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{request.employeeCode}</p></div> }] : []),
    { header: "Notice dates", cell: (request) => <div><p className="font-bold text-ink">Submitted {formatDate(request.resignationDate)}</p><p className="mt-1 text-xs text-ink/55">Proposed LWD: {formatDate(request.proposedLastWorkingDate)}</p>{request.approvedLastWorkingDate && <p className="mt-1 text-xs font-bold text-fern">Final LWD: {formatDate(request.approvedLastWorkingDate)}</p>}</div> },
    { header: "Reason", cell: (request) => <p className="max-w-xs whitespace-pre-wrap text-sm">{request.reason}</p> },
    { header: "Status", cell: (request) => <Badge value={request.status} /> },
    { header: "Review", cell: (request) => <div className="max-w-xs text-sm"><p className={request.reviewerComment ? "whitespace-pre-wrap" : "text-ink/40"}>{request.reviewerComment || (request.status === "PENDING" ? "Awaiting HR review" : "No comment")}</p>{request.relievingDate && <p className="mt-1 text-xs font-semibold text-ink/55">Relieving: {formatDate(request.relievingDate)}</p>}</div> },
    { header: "Actions", cell: (request) => request.status === "PENDING" ? <div className="flex flex-wrap gap-2">{canApprove && <><Button type="button" variant="secondary" className="px-3 text-emerald-700" onClick={() => openDecision(request, "APPROVED")}><Check size={15} />Approve</Button><Button type="button" variant="secondary" className="px-3 text-red-700" onClick={() => openDecision(request, "REJECTED")}><X size={15} />Reject</Button></>}{(personnel || request.requestedByEmail === user?.email) && <Button type="button" variant="secondary" className="px-3" onClick={() => void cancel(request)}>Withdraw</Button>}</div> : <span className="text-sm text-ink/45">—</span> },
  ];

  return <div className="space-y-6"><Card><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Employee separation</p><h2 className="mt-2 font-display text-3xl font-extrabold text-ink">{personnel ? "My Resignation Request" : "Resignation Requests"}</h2><p className="mt-2 max-w-3xl text-sm text-ink/60">{personnel ? "Submit your intended last working date and track HR’s decision." : "Approve the final working and relieving dates. Payroll is automatically prorated through the approved last working day."}</p></div><Button type="button" onClick={openCreate}><Plus size={18} />New resignation request</Button></div><div className={`mt-6 grid gap-3 ${personnel ? "md:grid-cols-[220px]" : "md:grid-cols-[1fr_220px]"}`}>{!personnel && <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} /><Input aria-label="Search resignation requests" className="pl-11" placeholder="Search employee name or code" value={search} onChange={(event) => { setPage(0); setSearch(event.target.value); }} /></div>}<SearchableSelect value={status} aria-label="Filter resignation status" options={[{ value: "", label: "All statuses" }, ...statuses.map((value) => ({ value, label: value }))]} onChange={(value) => { setPage(0); setStatus(value as "" | ResignationStatus); }} /></div></Card>{error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}<DataTable rows={requests.content} columns={columns} loading={loading} emptyTitle={personnel ? "No resignation request yet" : "No resignation requests found"} page={requests.page} totalPages={requests.totalPages} totalElements={requests.totalElements} onPageChange={setPage} getRowKey={(request) => request.id} />
    <Modal open={createOpen} onClose={() => !saving && setCreateOpen(false)} title="New resignation request" description="Your request remains pending until HR confirms the final separation dates."><form className="space-y-4" onSubmit={submit}>{!personnel && <SearchableSelect label="Employee" value={String(form.employeeId || "")} options={employees.map((employee) => ({ value: String(employee.id), label: `${employee.employeeCode} — ${employee.fullName}` }))} onChange={(value) => setForm({ ...form, employeeId: Number(value) || undefined })} />}<Input label="Proposed last working date" type="date" min={today()} value={form.proposedLastWorkingDate} onChange={(event) => setForm({ ...form, proposedLastWorkingDate: event.target.value })} /><Textarea label="Reason" maxLength={800} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />{formError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{formError}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Submitting..." : "Submit request"}</Button></div></form></Modal>
    <Modal open={Boolean(decision)} onClose={() => !deciding && setDecision(null)} title={`${decision?.status === "APPROVED" ? "Approve" : "Reject"} resignation`} description={decision?.status === "APPROVED" ? "Set the final dates before approval. These dates drive the last payroll proration." : "Add an optional review comment before rejecting the request."}><div className="space-y-4">{decision?.status === "APPROVED" && <div className="grid gap-4 md:grid-cols-2"><Input label="Approved last working date" type="date" value={approvedLastWorkingDate} onChange={(event) => setApprovedLastWorkingDate(event.target.value)} /><Input label="Relieving date" type="date" min={approvedLastWorkingDate} value={relievingDate} onChange={(event) => setRelievingDate(event.target.value)} /></div>}<Textarea label="Reviewer comment" maxLength={800} value={comment} onChange={(event) => setComment(event.target.value)} />{decisionError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{decisionError}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setDecision(null)} disabled={deciding}>Cancel</Button><Button type="button" onClick={() => void submitDecision()} disabled={deciding}>{deciding ? "Saving..." : `Confirm ${decision?.status === "APPROVED" ? "approval" : "rejection"}`}</Button></div></div></Modal>
  </div>;
}
