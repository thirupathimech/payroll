import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Eye, Paperclip, Plus, Search, Upload, X } from "lucide-react";
import { employeeApi, reimbursementApi } from "../api/payroll";
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
import { formatCurrency, formatDate } from "../lib/format";
import type { Employee, PageResponse, ReimbursementPayload, ReimbursementRequest, ReimbursementStatus } from "../types";

const emptyPage: PageResponse<ReimbursementRequest> = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true };
const statuses: ReimbursementStatus[] = ["PENDING", "APPROVED", "PAID", "REJECTED", "CANCELLED"];
const today = () => new Date().toISOString().slice(0, 10);
const initialForm = (): ReimbursementPayload => ({ expenseDate: today(), category: "Travel", amount: 0, description: "" });
const categories = ["Travel", "Meals", "Accommodation", "Mobile & Internet", "Office Supplies", "Client Expense", "Training", "Other"];

function openBlob(blob: Blob, download: boolean, fileName: string) {
  const url = URL.createObjectURL(blob);
  if (download) { const link = document.createElement("a"); link.href = url; link.download = fileName; link.click(); }
  else window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function ReimbursementPage() {
  const { viewMode, user } = useAuth();
  const personnel = viewMode === "personnel";
  const canApprove = !personnel;
  const [requests, setRequests] = useState<PageResponse<ReimbursementRequest>>(emptyPage);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState(""); const [status, setStatus] = useState<"" | ReimbursementStatus>(""); const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false); const [form, setForm] = useState<ReimbursementPayload>(initialForm); const [files, setFiles] = useState<File[]>([]); const [formError, setFormError] = useState(""); const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState<{ request: ReimbursementRequest; status: "APPROVED" | "REJECTED" } | null>(null); const [comment, setComment] = useState(""); const [deciding, setDeciding] = useState(false); const [decisionError, setDecisionError] = useState("");
  const debouncedSearch = useDebounce(search);

  const load = useCallback(() => { setLoading(true); setError(""); return reimbursementApi.search({ search: personnel ? undefined : debouncedSearch, status, mine: personnel, page, size: 10 }).then(setRequests).catch((apiError) => { setRequests(emptyPage); setError(getErrorMessage(apiError)); }).finally(() => setLoading(false)); }, [debouncedSearch, page, personnel, status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!personnel) employeeApi.search({ page: 0, size: 200 }).then((result) => setEmployees(result.content)).catch(() => setEmployees([])); }, [personnel]);
  function openCreate() { setForm(initialForm()); setFiles([]); setFormError(""); setCreateOpen(true); }
  function chooseFiles(event: ChangeEvent<HTMLInputElement>) { setFiles(Array.from(event.target.files ?? []).slice(0, 5)); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if ((!personnel && !form.employeeId) || !form.expenseDate || !form.category || !form.amount || form.amount <= 0 || !form.description.trim()) { setFormError("Complete the expense date, category, amount, and business purpose."); return; }
    if (form.expenseDate > today()) { setFormError("Expense date cannot be in the future."); return; }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) { setFormError("Each receipt must be 5 MB or smaller."); return; }
    setSaving(true); setFormError("");
    try { const saved = await reimbursementApi.create({ ...form, description: form.description.trim() }); for (const file of files) await reimbursementApi.uploadAttachment(saved.id, file); setCreateOpen(false); setPage(0); load(); }
    catch (apiError) { setFormError(getErrorMessage(apiError)); } finally { setSaving(false); }
  }
  async function submitDecision() { if (!decision) return; setDeciding(true); setDecisionError(""); try { await reimbursementApi.decide(decision.request.id, decision.status, comment.trim()); setDecision(null); load(); } catch (apiError) { setDecisionError(getErrorMessage(apiError)); } finally { setDeciding(false); } }
  async function cancel(request: ReimbursementRequest) { try { await reimbursementApi.cancel(request.id); load(); } catch (apiError) { setError(getErrorMessage(apiError)); } }
  async function download(requestId: number, attachmentId: number, name: string, preview = false) { try { const blob = preview ? await reimbursementApi.previewAttachment(requestId, attachmentId) : await reimbursementApi.downloadAttachment(requestId, attachmentId); openBlob(blob, !preview, name); } catch (apiError) { setError(getErrorMessage(apiError)); } }

  const columns: Column<ReimbursementRequest>[] = [
    ...(!personnel ? [{ header: "Employee", cell: (request: ReimbursementRequest) => <div><p className="font-bold text-ink">{request.employeeName}</p><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{request.employeeCode}</p></div> }] : []),
    { header: "Expense", cell: (request) => <div><p className="font-bold text-ink">{request.category}</p><p className="mt-1 text-xs text-ink/55">{formatDate(request.expenseDate)}</p></div> },
    { header: "Amount", cell: (request) => <span className="font-bold text-ink">{formatCurrency(request.amount, "INR")}</span> },
    { header: "Business purpose", cell: (request) => <p className="max-w-xs whitespace-pre-wrap text-sm">{request.description}</p> },
    { header: "Receipts", cell: (request) => request.attachments.length ? <div className="space-y-1">{request.attachments.map((attachment) => <div key={attachment.id} className="flex items-center gap-2 text-xs"><Paperclip size={13} /><button type="button" className="max-w-[130px] truncate text-left font-semibold text-fern hover:underline" title={attachment.originalFileName} onClick={() => void download(request.id, attachment.id, attachment.originalFileName)}>{attachment.originalFileName}</button>{attachment.previewSupported && <button type="button" className="text-ink/50 hover:text-ink" aria-label={`Preview ${attachment.originalFileName}`} onClick={() => void download(request.id, attachment.id, attachment.originalFileName, true)}><Eye size={14} /></button>}</div>)}</div> : <span className="text-sm text-ink/40">No receipt</span> },
    { header: "Status", cell: (request) => <div className="space-y-1"><Badge value={request.status} />{request.payrollRunId && request.status !== "PAID" && <p className="text-xs text-ink/50">Queued in payroll #{request.payrollRunId}</p>}</div> },
    { header: "Review", cell: (request) => <div className="max-w-xs text-sm"><p className={request.reviewerComment ? "whitespace-pre-wrap" : "text-ink/40"}>{request.reviewerComment || (request.status === "PENDING" ? "Awaiting review" : "No comment")}</p>{request.paidAt && <p className="mt-1 text-xs font-semibold text-emerald-700">Paid with payroll</p>}</div> },
    { header: "Actions", cell: (request) => request.status === "PENDING" ? <div className="flex flex-wrap gap-2">{canApprove && <><Button type="button" variant="secondary" className="px-3 text-emerald-700" onClick={() => { setDecision({ request, status: "APPROVED" }); setComment(""); setDecisionError(""); }}><Check size={15} />Approve</Button><Button type="button" variant="secondary" className="px-3 text-red-700" onClick={() => { setDecision({ request, status: "REJECTED" }); setComment(""); setDecisionError(""); }}><X size={15} />Reject</Button></>}{(personnel || request.requestedByEmail === user?.email) && <Button type="button" variant="secondary" className="px-3" onClick={() => void cancel(request)}>Cancel</Button>}</div> : <span className="text-sm text-ink/45">—</span> },
  ];

  return <div className="space-y-6"><Card><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Expenses</p><h2 className="mt-2 font-display text-3xl font-extrabold text-ink">{personnel ? "My Reimbursements" : "Reimbursement Requests"}</h2><p className="mt-2 max-w-3xl text-sm text-ink/60">{personnel ? "Submit approved business expenses with receipts. Approved claims are paid through payroll." : "Approve valid business expenses. Only approved claims are queued once for payroll and become paid when that payroll is locked."}</p></div><Button type="button" onClick={openCreate}><Plus size={18} />New reimbursement</Button></div><div className={`mt-6 grid gap-3 ${personnel ? "md:grid-cols-[220px]" : "md:grid-cols-[1fr_220px]"}`}>{!personnel && <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} /><Input aria-label="Search reimbursements" className="pl-11" placeholder="Search employee, code, or category" value={search} onChange={(event) => { setPage(0); setSearch(event.target.value); }} /></div>}<SearchableSelect value={status} aria-label="Filter reimbursement status" options={[{ value: "", label: "All statuses" }, ...statuses.map((value) => ({ value, label: value }))]} onChange={(value) => { setPage(0); setStatus(value as "" | ReimbursementStatus); }} /></div></Card>{error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}<DataTable rows={requests.content} columns={columns} loading={loading} emptyTitle={personnel ? "No reimbursements yet" : "No reimbursement requests found"} page={requests.page} totalPages={requests.totalPages} totalElements={requests.totalElements} onPageChange={setPage} getRowKey={(request) => request.id} />
    <Modal open={createOpen} onClose={() => !saving && setCreateOpen(false)} title="New reimbursement" description="Attach up to five PDF or image receipts (5 MB each). The claim is paid only after approval and payroll lock."><form className="space-y-4" onSubmit={submit}>{!personnel && <SearchableSelect label="Employee" value={String(form.employeeId || "")} options={employees.map((employee) => ({ value: String(employee.id), label: `${employee.employeeCode} — ${employee.fullName}` }))} onChange={(value) => setForm({ ...form, employeeId: Number(value) || undefined })} />}<div className="grid gap-4 md:grid-cols-3"><Input label="Expense date" type="date" max={today()} value={form.expenseDate} onChange={(event) => setForm({ ...form, expenseDate: event.target.value })} /><SearchableSelect label="Category" value={form.category} options={categories.map((value) => ({ value, label: value }))} onChange={(value) => setForm({ ...form, category: value })} /><Input label="Amount" type="number" min="0.01" step="0.01" value={form.amount || ""} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} /></div><Textarea label="Business purpose" maxLength={1200} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><div><label className="mb-2 block text-sm font-bold text-ink">Receipts <span className="font-medium text-ink/45">(optional)</span></label><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line bg-mist/40 px-4 py-3 text-sm font-semibold text-ink/70 hover:bg-mist"><Upload size={16} />Choose PDF or image receipts<input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple onChange={chooseFiles} /></label>{files.length > 0 && <p className="mt-2 text-xs font-semibold text-ink/60">{files.map((file) => file.name).join(", ")}</p>}</div>{formError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{formError}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Submitting..." : "Submit reimbursement"}</Button></div></form></Modal>
    <Modal open={Boolean(decision)} onClose={() => !deciding && setDecision(null)} title={`${decision?.status === "APPROVED" ? "Approve" : "Reject"} reimbursement`} description={decision?.status === "APPROVED" ? "Approval makes this claim eligible for a future payroll run. It is marked paid only when that payroll is locked." : "Add an optional review comment before rejecting the claim."}><div className="space-y-4"><p className="rounded-2xl bg-mist px-4 py-3 text-sm font-semibold text-ink/70">{decision?.request.employeeName} · {decision && formatCurrency(decision.request.amount, "INR")} · {decision?.request.category}</p><Textarea label="Reviewer comment" maxLength={800} value={comment} onChange={(event) => setComment(event.target.value)} />{decisionError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{decisionError}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setDecision(null)} disabled={deciding}>Cancel</Button><Button type="button" onClick={() => void submitDecision()} disabled={deciding}>{deciding ? "Saving..." : `Confirm ${decision?.status === "APPROVED" ? "approval" : "rejection"}`}</Button></div></div></Modal>
  </div>;
}
