import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { employeeApi, overtimeApi, overtimePolicyApi } from "../api/payroll";
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
import type { Employee, OvertimePayload, OvertimeRequest, OvertimeStatus, PageResponse } from "../types";

const emptyPage: PageResponse<OvertimeRequest> = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true };
const statuses: OvertimeStatus[] = ["PENDING", "APPROVED", "PAID", "REJECTED", "CANCELLED"];
const today = () => new Date().toISOString().slice(0, 10);
const initialForm = (): OvertimePayload => ({ overtimeDate: today(), requestedMinutes: 60, reason: "" });

function duration(minutes?: number) {
  const safeMinutes = Math.max(0, minutes ?? 0);
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function OvertimePage() {
  const { viewMode, user } = useAuth();
  const personnel = viewMode === "personnel";
  const canApprove = !personnel;
  const [requests, setRequests] = useState<PageResponse<OvertimeRequest>>(emptyPage);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | OvertimeStatus>("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<OvertimePayload>(initialForm);
  const [requestedHours, setRequestedHours] = useState("1");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState<{ request: OvertimeRequest; status: "APPROVED" | "REJECTED" } | null>(null);
  const [comment, setComment] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [overtimeEligible, setOvertimeEligible] = useState(false);
  const debouncedSearch = useDebounce(search);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return overtimeApi.search({ search: personnel ? undefined : debouncedSearch, status, mine: personnel, page, size: 10 })
      .then(setRequests)
      .catch((apiError) => { setRequests(emptyPage); setError(getErrorMessage(apiError)); })
      .finally(() => setLoading(false));
  }, [debouncedSearch, page, personnel, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!personnel) employeeApi.search({ page: 0, size: 200 }).then((result) => setEmployees(result.content)).catch(() => setEmployees([]));
  }, [personnel]);
  useEffect(() => {
    if (!personnel) { setOvertimeEligible(true); return; }
    overtimePolicyApi.myEligibility().then((eligibility) => setOvertimeEligible(eligibility.eligible)).catch(() => setOvertimeEligible(false));
  }, [personnel]);

  function openCreate() {
    setForm(initialForm());
    setRequestedHours("1");
    setFormError("");
    setCreateOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const hours = Number(requestedHours);
    const requestedMinutes = Math.round(hours * 60);
    if ((!personnel && !form.employeeId) || !form.overtimeDate || !Number.isFinite(hours) || requestedMinutes < 1 || requestedMinutes > 1439) {
      setFormError("Choose an employee, a past or current date, and an overtime duration below 24 hours.");
      return;
    }
    if (form.overtimeDate > today()) {
      setFormError("Overtime cannot be requested for a future date.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await overtimeApi.create({ ...form, requestedMinutes, reason: form.reason?.trim() || undefined });
      setCreateOpen(false);
      setPage(0);
      load();
    } catch (apiError) {
      setFormError(getErrorMessage(apiError));
    } finally {
      setSaving(false);
    }
  }

  async function submitDecision() {
    if (!decision) return;
    setDeciding(true);
    setDecisionError("");
    try {
      await overtimeApi.decide(decision.request.id, decision.status, comment.trim() || undefined);
      setDecision(null);
      load();
    } catch (apiError) {
      setDecisionError(getErrorMessage(apiError));
    } finally {
      setDeciding(false);
    }
  }

  async function cancel(request: OvertimeRequest) {
    try {
      await overtimeApi.cancel(request.id);
      load();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  const columns: Column<OvertimeRequest>[] = [
    ...(!personnel ? [{ header: "Employee", cell: (request: OvertimeRequest) => <div><p className="font-bold text-ink">{request.employeeName}</p><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{request.employeeCode}</p></div> }] : []),
    { header: "Date", cell: (request) => <span className="font-bold text-ink">{formatDate(request.overtimeDate)}</span> },
    { header: "Hours", cell: (request) => <div className="space-y-1 text-sm"><p><span className="text-ink/55">Requested </span><span className="font-bold">{duration(request.requestedMinutes)}</span></p><p><span className="text-ink/55">Punch OT </span><span className="font-bold">{duration(request.punchOvertimeMinutes)}</span></p><p className="text-fern"><span>Counted </span><span className="font-extrabold">{duration(["APPROVED", "PAID"].includes(request.status) ? request.approvedMinutes : request.eligibleMinutes)}</span></p></div> },
    { header: "Reason", cell: (request) => <p className={request.reason ? "max-w-xs whitespace-pre-wrap text-sm" : "text-sm text-ink/40"}>{request.reason || "No reason provided"}</p> },
    { header: "Status", cell: (request) => <div className="space-y-1"><Badge value={request.status} />{request.payrollRunId && request.status !== "PAID" && <p className="text-xs text-ink/50">Queued in payroll #{request.payrollRunId}</p>}</div> },
    { header: "Review", cell: (request) => <p className={request.reviewerComment ? "max-w-xs whitespace-pre-wrap text-sm" : "text-sm text-ink/40"}>{request.reviewerComment || (request.status === "PENDING" ? "Awaiting review" : "No comment")}</p> },
    { header: "Actions", cell: (request) => request.status === "PENDING" ? <div className="flex flex-wrap gap-2">{canApprove && <><Button type="button" variant="secondary" className="px-3 text-emerald-700" onClick={() => { setDecision({ request, status: "APPROVED" }); setComment(""); setDecisionError(""); }}><Check size={15} />Approve</Button><Button type="button" variant="secondary" className="px-3 text-red-700" onClick={() => { setDecision({ request, status: "REJECTED" }); setComment(""); setDecisionError(""); }}><X size={15} />Reject</Button></>}{(personnel || request.requestedByEmail === user?.email) && <Button type="button" variant="secondary" className="px-3" onClick={() => void cancel(request)}>Cancel</Button>}</div> : <span className="text-sm text-ink/45">—</span> },
  ];

  return <div className="space-y-6">
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Attendance-based overtime</p><h2 className="mt-2 font-display text-3xl font-extrabold text-ink">{personnel ? "My Overtime Requests" : "Overtime Requests"}</h2><p className="mt-2 max-w-3xl text-sm text-ink/60">Punch time outside the scheduled work blocks is eligible for overtime. Time worked through an assigned break and after the shift both count. The counted duration is always the lower of the request and punch-based overtime. Approved hours are paid through payroll at the policy rate for the employee group.</p>{personnel && !overtimeEligible && <p className="mt-2 text-sm font-semibold text-ink/50">Your employee group is not currently eligible for overtime.</p>}</div>{overtimeEligible && <Button type="button" onClick={openCreate}><Plus size={18} />New overtime request</Button>}</div>
      <div className={`mt-6 grid gap-3 ${personnel ? "md:grid-cols-[220px]" : "md:grid-cols-[1fr_220px]"}`}>{!personnel && <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} /><Input aria-label="Search overtime requests" className="pl-11" placeholder="Search employee or code" value={search} onChange={(event) => { setPage(0); setSearch(event.target.value); }} /></div>}<SearchableSelect value={status} aria-label="Filter overtime status" options={[{ value: "", label: "All statuses" }, ...statuses.map((value) => ({ value, label: value }))]} onChange={(value) => { setPage(0); setStatus(value as "" | OvertimeStatus); }} /></div>
    </Card>
    {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
    <DataTable rows={requests.content} columns={columns} loading={loading} emptyTitle={personnel ? "No overtime requests yet" : "No overtime requests found"} page={requests.page} totalPages={requests.totalPages} totalElements={requests.totalElements} onPageChange={setPage} getRowKey={(request) => request.id} />
    <Modal open={createOpen} onClose={() => !saving && setCreateOpen(false)} title="New overtime request" description="Enter the hours requested. Approval uses completed attendance punches and never counts more than the requested duration."><form className="space-y-4" onSubmit={submit}>{!personnel && <SearchableSelect label="Employee" value={String(form.employeeId || "")} options={employees.map((employee) => ({ value: String(employee.id), label: `${employee.employeeCode} — ${employee.fullName}` }))} onChange={(value) => setForm({ ...form, employeeId: Number(value) || undefined })} />}<div className="grid gap-4 md:grid-cols-2"><Input label="Overtime date" type="date" max={today()} value={form.overtimeDate} onChange={(event) => setForm({ ...form, overtimeDate: event.target.value })} /><Input label="Requested hours" type="number" min="0.02" max="23.98" step="0.25" value={requestedHours} onChange={(event) => setRequestedHours(event.target.value)} /></div><Textarea label="Reason (optional)" maxLength={800} value={form.reason || ""} onChange={(event) => setForm({ ...form, reason: event.target.value })} />{formError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{formError}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Submitting..." : "Submit overtime request"}</Button></div></form></Modal>
    <Modal open={Boolean(decision)} onClose={() => !deciding && setDecision(null)} title={`${decision?.status === "APPROVED" ? "Approve" : "Reject"} overtime request`} description={decision?.status === "APPROVED" ? "The approved duration is capped automatically at the completed punch-based overtime. A completed IN and OUT punch is required." : "Add an optional review comment before rejecting the request."}><div className="space-y-4"><div className="rounded-2xl bg-mist px-4 py-3 text-sm font-semibold text-ink/70"><p>{decision?.request.employeeName} · {decision && formatDate(decision.request.overtimeDate)}</p>{decision && <p className="mt-2">Requested {duration(decision.request.requestedMinutes)} · Punch OT {duration(decision.request.punchOvertimeMinutes)} · Counted {duration(decision.request.eligibleMinutes)}</p>}</div><Textarea label="Reviewer comment" maxLength={800} value={comment} onChange={(event) => setComment(event.target.value)} />{decisionError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{decisionError}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setDecision(null)} disabled={deciding}>Cancel</Button><Button type="button" onClick={() => void submitDecision()} disabled={deciding}>{deciding ? "Saving..." : `Confirm ${decision?.status === "APPROVED" ? "approval" : "rejection"}`}</Button></div></div></Modal>
  </div>;
}
