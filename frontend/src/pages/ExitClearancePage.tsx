import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Download, FileCheck2, FileText, Pencil, Plus, ReceiptText, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";
import { exitClearanceApi, resignationApi, settingsApi } from "../api/payroll";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { formatCurrency, formatDate } from "../lib/format";
import { downloadPdf } from "../lib/reporting";
import type { AssetCatalogItem, AssetCatalogItemPayload, AssetRelease, AssetReturnStatus, CompanySettings, ExitClearance, FinalSettlementPayload, ResignationRequest } from "../types";

const today = () => new Date().toISOString().slice(0, 10);

const emptyCatalogForm = (): AssetCatalogItemPayload => ({ name: "", category: "", returnable: true, defaultRecoveryAmount: 0, active: true });
const emptySettlement = (): FinalSettlementPayload => ({
  leaveEncashmentDays: 0,
  leaveEncashmentAmount: 0,
  noticePayRecovery: 0,
  otherEarnings: 0,
  otherDeductions: 0,
  remarks: "",
  settled: false,
  settledOn: undefined,
});
const settlementFrom = (detail: ExitClearance): FinalSettlementPayload => ({
  leaveEncashmentDays: detail.settlement.leaveEncashmentDays,
  leaveEncashmentAmount: detail.settlement.leaveEncashmentAmount,
  noticePayRecovery: detail.settlement.noticePayRecovery,
  otherEarnings: detail.settlement.otherEarnings,
  otherDeductions: detail.settlement.otherDeductions,
  remarks: detail.settlement.remarks || "",
  settled: detail.settlement.settled,
  settledOn: detail.settlement.settledOn,
});

type DocumentType = "FNF" | "PAYSLIP" | "RELIEVING" | "EXPERIENCE" | "NO_DUES";
type SettlementAmount = "leaveEncashmentDays" | "leaveEncashmentAmount" | "noticePayRecovery" | "otherEarnings" | "otherDeductions";

function documentTitle(type: DocumentType) {
  return ({ FNF: "Full & Final Statement", PAYSLIP: "Final Payslip", RELIEVING: "Relieving Letter", EXPERIENCE: "Experience Letter", NO_DUES: "No Dues Certificate" })[type];
}

function tenure(start: string, end?: string) {
  if (!end) return "";
  const from = new Date(start); const to = new Date(end);
  let months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
  if (to.getDate() < from.getDate()) months -= 1;
  return `${Math.max(0, Math.floor(months / 12))} year(s) ${Math.max(0, months % 12)} month(s)`;
}

function DocumentHeader({ company, title }: { company: CompanySettings | null; title: string }) {
  return <header className="company-header border-b-2 border-moss pb-5 text-center">
    <div className="flex items-center justify-center gap-4">
      {company?.logoDataUrl && <img data-org-logo="true" className="h-14 w-20 object-contain" src={company.logoDataUrl} alt="Organization logo" />}
      <div><h2 className="font-display text-2xl font-extrabold text-ink">{company?.legalName || company?.companyName || "Company"}</h2><p className="mt-1 text-xs text-ink/60">{company?.address || [company?.addressLine1, company?.city, company?.state, company?.postalCode].filter(Boolean).join(", ")}</p></div>
    </div>
    <h1 className="mt-6 font-display text-xl font-extrabold uppercase tracking-wide text-ink">{title}</h1>
  </header>;
}

function MoneyRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-6 border-b border-line py-2.5 text-sm ${strong ? "font-extrabold text-ink" : "text-ink/75"}`}><span>{label}</span><span className="whitespace-nowrap">{value}</span></div>;
}

function ExitDocument({ type, detail, company, currency }: { type: DocumentType; detail: ExitClearance; company: CompanySettings | null; currency: string }) {
  const { employee, resignation, financialSummary: finance, settlement, finalPayslip, clearance } = detail;
  const finalDate = resignation.relievingDate || resignation.approvedLastWorkingDate;
  const letterDate = settlement.settledOn || finalDate || today();
  const money = (value: number) => formatCurrency(value, currency);
  if (type === "FNF") return <article className="mx-auto max-w-[760px] bg-white p-8 text-ink"><DocumentHeader company={company} title="Full & Final Settlement Statement" /><section className="mt-7 grid gap-2 text-sm sm:grid-cols-2"><p><span className="font-bold">Employee:</span> {employee.fullName}</p><p><span className="font-bold">Employee ID:</span> {employee.employeeCode}</p><p><span className="font-bold">Department:</span> {employee.departmentName}</p><p><span className="font-bold">Designation:</span> {employee.designationTitle}</p><p><span className="font-bold">Last working day:</span> {formatDate(resignation.approvedLastWorkingDate)}</p><p><span className="font-bold">Settlement status:</span> {settlement.settled ? "Paid" : "Draft for review"}</p></section><section className="mt-7"><h3 className="border-b border-moss pb-2 font-display text-lg font-extrabold">Credits</h3><MoneyRow label="Final payroll net pay" value={money(finance.finalPayslipNetPay)} /><MoneyRow label={`Leave encashment (${settlement.leaveEncashmentDays} day(s))`} value={money(finance.leaveEncashmentAmount)} /><MoneyRow label="Other earnings" value={money(finance.otherEarnings)} /><MoneyRow label="Total credits" value={money(finance.totalCredits)} strong /></section><section className="mt-6"><h3 className="border-b border-moss pb-2 font-display text-lg font-extrabold">Recoveries and deductions</h3><MoneyRow label="Notice pay recovery" value={money(finance.noticePayRecovery)} /><MoneyRow label="Asset recovery" value={money(finance.assetRecoveryAmount)} /><MoneyRow label="Other deductions" value={money(finance.otherDeductions)} /><MoneyRow label="Total deductions" value={money(finance.totalDeductions)} strong /></section><div className="mt-7 rounded-xl bg-moss px-5 py-4 text-white"><div className="flex items-center justify-between font-display text-xl font-extrabold"><span>Net settlement payable</span><span>{money(finance.netSettlementPayable)}</span></div></div>{settlement.remarks && <p className="mt-6 whitespace-pre-wrap text-sm leading-6 text-ink/70"><span className="font-bold">Remarks: </span>{settlement.remarks}</p>}<p className="mt-12 text-sm text-ink/60">Prepared on {formatDate(today())}. This statement is generated from approved exit-clearance and payroll records.</p></article>;
  if (type === "PAYSLIP" && finalPayslip) return <article className="mx-auto max-w-[760px] bg-white p-8 text-ink"><DocumentHeader company={company} title="Final Payslip" /><section className="mt-7 grid gap-2 text-sm sm:grid-cols-2"><p><span className="font-bold">Employee:</span> {employee.fullName}</p><p><span className="font-bold">Employee ID:</span> {employee.employeeCode}</p><p><span className="font-bold">Pay period:</span> {new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(finalPayslip.periodYear, finalPayslip.periodMonth - 1))}</p><p><span className="font-bold">Payable days:</span> {finalPayslip.payableDays} / {finalPayslip.periodDays}</p></section><section className="mt-7 grid gap-7 sm:grid-cols-2"><div><h3 className="border-b border-moss pb-2 font-display text-lg font-extrabold">Earnings</h3>{finalPayslip.componentLines.filter((line) => line.category === "EARNING").map((line) => <MoneyRow key={line.code} label={line.name} value={money(line.amount)} />)}<MoneyRow label="Gross earnings" value={money(finalPayslip.grossEarnings)} strong /></div><div><h3 className="border-b border-moss pb-2 font-display text-lg font-extrabold">Deductions</h3>{finalPayslip.componentLines.filter((line) => line.category === "DEDUCTION").map((line) => <MoneyRow key={line.code} label={line.name} value={money(line.amount)} />)}<MoneyRow label="Total deductions" value={money(finalPayslip.totalDeductions)} strong /></div></section><div className="mt-7 rounded-xl bg-moss px-5 py-4 text-white"><div className="flex items-center justify-between font-display text-xl font-extrabold"><span>Net pay</span><span>{money(finalPayslip.netPay)}</span></div></div><p className="mt-10 text-sm text-ink/60">This is the last approved payroll snapshot available for the employee.</p></article>;
  if (type === "RELIEVING") return <article className="mx-auto max-w-[760px] bg-white p-9 text-ink"><DocumentHeader company={company} title="Relieving Letter" /><p className="mt-9 text-sm">Date: {formatDate(letterDate)}</p><p className="mt-7 text-sm">To whom it may concern,</p><p className="mt-6 text-sm leading-7">This is to certify that <strong>{employee.fullName}</strong> (Employee ID: <strong>{employee.employeeCode}</strong>) was employed with <strong>{company?.legalName || company?.companyName || "our organization"}</strong> as <strong>{employee.designationTitle}</strong> in the <strong>{employee.departmentName}</strong> department.</p><p className="mt-5 text-sm leading-7">The employee has been relieved from duties effective <strong>{formatDate(finalDate)}</strong>, following completion of the prescribed exit-clearance process.</p><p className="mt-5 text-sm leading-7">We thank {employee.fullName.split(" ")[0]} for the contribution and wish them success in future endeavors.</p><div className="mt-20 text-sm"><p className="font-bold">For {company?.legalName || company?.companyName || "Company"}</p><p className="mt-12">Authorized Signatory</p></div></article>;
  if (type === "EXPERIENCE") return <article className="mx-auto max-w-[760px] bg-white p-9 text-ink"><DocumentHeader company={company} title="Experience Letter" /><p className="mt-9 text-sm">Date: {formatDate(letterDate)}</p><p className="mt-7 text-sm">To whom it may concern,</p><p className="mt-6 text-sm leading-7">This is to confirm that <strong>{employee.fullName}</strong> (Employee ID: <strong>{employee.employeeCode}</strong>) worked with <strong>{company?.legalName || company?.companyName || "our organization"}</strong> from <strong>{formatDate(employee.joiningDate)}</strong> to <strong>{formatDate(resignation.approvedLastWorkingDate)}</strong> as <strong>{employee.designationTitle}</strong>.</p><p className="mt-5 text-sm leading-7">During this period of {tenure(employee.joiningDate, resignation.approvedLastWorkingDate)}, the employee was associated with the <strong>{employee.departmentName}</strong> department. Their conduct and service were found to be satisfactory.</p><p className="mt-5 text-sm leading-7">We wish them every success in future assignments.</p><div className="mt-20 text-sm"><p className="font-bold">For {company?.legalName || company?.companyName || "Company"}</p><p className="mt-12">Authorized Signatory</p></div></article>;
  return <article className="mx-auto max-w-[760px] bg-white p-9 text-ink"><DocumentHeader company={company} title="No Dues Certificate" /><p className="mt-9 text-sm">Date: {formatDate(letterDate)}</p><p className="mt-7 text-sm">This is to certify that <strong>{employee.fullName}</strong> (Employee ID: <strong>{employee.employeeCode}</strong>), formerly <strong>{employee.designationTitle}</strong> in the <strong>{employee.departmentName}</strong> department, has completed the required exit clearance.</p><section className="mt-6 rounded-xl border border-line bg-moss/5 p-5 text-sm"><p><strong>Assets reviewed:</strong> {clearance.totalAssets}</p><p className="mt-2"><strong>Returned:</strong> {clearance.returnedAssets} · <strong>Recovered:</strong> {clearance.recoveredAssets}</p><p className="mt-2"><strong>Clearance verified:</strong> {formatDate(clearance.completedAt?.slice(0, 10))}</p><p className="mt-2"><strong>Final settlement paid:</strong> {formatDate(settlement.settledOn)}</p></section><p className="mt-6 text-sm leading-7">Based on the organization’s exit-clearance and final-settlement records, there are no outstanding dues requiring action from the employee or the organization as of the date of this certificate.</p><div className="mt-20 text-sm"><p className="font-bold">For {company?.legalName || company?.companyName || "Company"}</p><p className="mt-12">Authorized Signatory</p></div></article>;
}

export function ExitClearancePage() {
  const { currency } = useAuth();
  const [catalog, setCatalog] = useState<AssetCatalogItem[]>([]);
  const [resignations, setResignations] = useState<ResignationRequest[]>([]);
  const [detail, setDetail] = useState<ExitClearance | null>(null);
  const [selectedResignationId, setSelectedResignationId] = useState("");
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogForm, setCatalogForm] = useState<AssetCatalogItemPayload>(emptyCatalogForm());
  const [editingCatalog, setEditingCatalog] = useState<AssetCatalogItem | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseAssetId, setReleaseAssetId] = useState("");
  const [releasedOn, setReleasedOn] = useState(today());
  const [releaseNote, setReleaseNote] = useState("");
  const [releaseError, setReleaseError] = useState("");
  const [returnRelease, setReturnRelease] = useState<AssetRelease | null>(null);
  const [returnStatus, setReturnStatus] = useState<AssetReturnStatus>("PENDING");
  const [returnedOn, setReturnedOn] = useState(today());
  const [recoveryAmount, setRecoveryAmount] = useState(0);
  const [returnNote, setReturnNote] = useState("");
  const [returnError, setReturnError] = useState("");
  const [settlementForm, setSettlementForm] = useState<FinalSettlementPayload>(emptySettlement());
  const [documentType, setDocumentType] = useState<DocumentType | null>(null);
  const [documentError, setDocumentError] = useState("");
  const documentRef = useRef<HTMLDivElement>(null);

  const loadBase = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [items, response, companySettings] = await Promise.all([
        exitClearanceApi.catalog(),
        resignationApi.search({ status: "APPROVED", page: 0, size: 100 }),
        settingsApi.get(),
      ]);
      setCatalog(items); setResignations(response.content); setCompany(companySettings);
    } catch (apiError) { setError(getErrorMessage(apiError)); }
    finally { setLoading(false); }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) { setDetail(null); return; }
    setBusy("loading-clearance"); setError("");
    try { setDetail(await exitClearanceApi.clearance(Number(id))); }
    catch (apiError) { setDetail(null); setError(getErrorMessage(apiError)); }
    finally { setBusy(""); }
  }, []);

  useEffect(() => { void loadBase(); }, [loadBase]);
  useEffect(() => { void loadDetail(selectedResignationId); }, [loadDetail, selectedResignationId]);
  useEffect(() => { if (detail) setSettlementForm(settlementFrom(detail)); }, [detail]);

  const activeCatalog = catalog.filter((item) => item.active);
  const selectedAsset = activeCatalog.find((item) => item.id === Number(releaseAssetId));

  function openCatalog(item?: AssetCatalogItem) {
    setEditingCatalog(item || null);
    setCatalogForm(item ? { name: item.name, category: item.category || "", returnable: item.returnable, defaultRecoveryAmount: item.defaultRecoveryAmount, active: item.active } : emptyCatalogForm());
    setCatalogError(""); setCatalogOpen(true);
  }
  async function saveCatalog(event: FormEvent) {
    event.preventDefault();
    if (!catalogForm.name.trim()) { setCatalogError("Enter the asset name."); return; }
    if (catalogForm.returnable && catalogForm.defaultRecoveryAmount <= 0) { setCatalogError("Enter the recovery amount for a returnable asset."); return; }
    setBusy("catalog"); setCatalogError("");
    try {
      const saved = editingCatalog ? await exitClearanceApi.updateCatalogItem(editingCatalog.id, catalogForm) : await exitClearanceApi.createCatalogItem(catalogForm);
      setCatalog((current) => editingCatalog ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setCatalogOpen(false);
    } catch (apiError) { setCatalogError(getErrorMessage(apiError)); }
    finally { setBusy(""); }
  }
  function openRelease() { setReleaseAssetId(""); setReleasedOn(today()); setReleaseNote(""); setReleaseError(""); setReleaseOpen(true); }
  async function saveRelease(event: FormEvent) {
    event.preventDefault(); if (!detail || !releaseAssetId || !releasedOn) { setReleaseError("Choose an asset and release date."); return; }
    setBusy("release"); setReleaseError("");
    try { setDetail(await exitClearanceApi.releaseAsset(detail.resignation.id, { assetCatalogItemId: Number(releaseAssetId), releasedOn, conditionNote: releaseNote.trim() || undefined })); setReleaseOpen(false); }
    catch (apiError) { setReleaseError(getErrorMessage(apiError)); } finally { setBusy(""); }
  }
  function openReturn(release: AssetRelease) {
    setReturnRelease(release); setReturnStatus(release.returnStatus); setReturnedOn(release.returnedOn || today()); setRecoveryAmount(release.recoveryAmount); setReturnNote(release.conditionNote || ""); setReturnError("");
  }
  async function saveReturn(event: FormEvent) {
    event.preventDefault(); if (!returnRelease) return;
    if (returnStatus === "RETURNED" && !returnedOn) { setReturnError("Enter the date the asset was returned."); return; }
    if (returnStatus === "NOT_RETURNED" && recoveryAmount <= 0) { setReturnError("Enter the recovery amount for an asset not returned."); return; }
    setBusy("return"); setReturnError("");
    try { setDetail(await exitClearanceApi.updateReturn(returnRelease.id, { returnStatus, returnedOn: returnStatus === "RETURNED" ? returnedOn : undefined, recoveryAmount: returnStatus === "NOT_RETURNED" ? recoveryAmount : 0, conditionNote: returnNote.trim() || undefined })); setReturnRelease(null); }
    catch (apiError) { setReturnError(getErrorMessage(apiError)); } finally { setBusy(""); }
  }
  async function completeClearance() {
    if (!detail) return; setBusy("complete"); setError("");
    try { setDetail(await exitClearanceApi.completeClearance(detail.resignation.id)); }
    catch (apiError) { setError(getErrorMessage(apiError)); } finally { setBusy(""); }
  }
  function setSettlementAmount(field: SettlementAmount, value: string) { setSettlementForm((current) => ({ ...current, [field]: Number(value) || 0 })); }
  async function saveSettlement(event: FormEvent) {
    event.preventDefault(); if (!detail) return; if (settlementForm.settled && !settlementForm.settledOn) { setError("Add the payment date before marking the final settlement as paid."); return; }
    setBusy("settlement"); setError("");
    try { setDetail(await exitClearanceApi.updateSettlement(detail.resignation.id, settlementForm)); }
    catch (apiError) { setError(getErrorMessage(apiError)); } finally { setBusy(""); }
  }
  async function downloadDocument() {
    if (!documentType || !documentRef.current || !detail) return;
    setDocumentError("");
    try { await downloadPdf({ element: documentRef.current, filename: `${detail.employee.employeeCode}-${documentTitle(documentType).replace(/\s+/g, "-").toLowerCase()}.pdf`, orientation: "portrait", contextErrorMessage: "Could not create the exit document.", waitForRender: true, logoUrl: company?.logoDataUrl }); }
    catch (apiError) { setDocumentError(getErrorMessage(apiError)); }
  }

  const reportCards: Array<{ type: DocumentType; description: string; icon: typeof FileText; enabled: boolean; reason?: string }> = detail ? [
    { type: "FNF", description: "Final payroll, encashment, asset recovery, and settlement calculation.", icon: WalletCards, enabled: true },
    { type: "PAYSLIP", description: "Last approved payroll snapshot with earnings and deductions.", icon: ReceiptText, enabled: Boolean(detail.finalPayslip), reason: "Generate and approve the final payroll first." },
    { type: "RELIEVING", description: "Employment separation confirmation using approved dates.", icon: FileCheck2, enabled: detail.clearance.completed, reason: "Complete asset clearance first." },
    { type: "EXPERIENCE", description: "Employment tenure and last held designation letter.", icon: FileText, enabled: detail.clearance.completed, reason: "Complete asset clearance first." },
    { type: "NO_DUES", description: "Certificate available only after clearance and final settlement payment.", icon: ShieldCheck, enabled: detail.noDuesEligible, reason: "Complete clearance and mark final settlement as paid." },
  ] : [];

  return <div className="space-y-6"><Card><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Employee exit management</p><h1 className="mt-1 font-display text-3xl font-extrabold text-ink">Asset Release & Exit Clearance</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">Release exit assets, verify each return or recovery, settle F&amp;F, then issue the final employee documents. Separation remains pending until HR completes clearance.</p></div><Button variant="secondary" onClick={() => void loadBase()} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh data</Button></div><div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]"><Select label="Approved resignation" value={selectedResignationId} onChange={(event) => setSelectedResignationId(event.target.value)}><option value="">Choose employee exit clearance</option>{resignations.map((resignation) => <option key={resignation.id} value={resignation.id}>{resignation.employeeCode} — {resignation.employeeName} · LWD {formatDate(resignation.approvedLastWorkingDate)}</option>)}</Select><Button className="self-end" variant="secondary" onClick={() => openCatalog()}><Plus size={17} />Create asset item</Button></div>{!loading && resignations.length === 0 && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">No approved resignations are available. Approve a resignation before beginning asset clearance.</p>}</Card>{error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
    {detail && <><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Card><p className="text-xs font-bold uppercase tracking-wider text-ink/45">Employee</p><p className="mt-2 font-display text-xl font-extrabold">{detail.employee.fullName}</p><p className="mt-1 text-sm text-ink/55">{detail.employee.employeeCode} · {detail.employee.designationTitle}</p></Card><Card><p className="text-xs font-bold uppercase tracking-wider text-ink/45">Asset clearance</p><p className={`mt-2 font-display text-xl font-extrabold ${detail.clearance.completed ? "text-emerald-700" : "text-amber-700"}`}>{detail.clearance.completed ? "Completed" : detail.clearance.readyToComplete ? "Ready for review" : "Action required"}</p><p className="mt-1 text-sm text-ink/55">{detail.clearance.returnedAssets} returned · {detail.clearance.recoveredAssets} recovery recorded · {detail.clearance.pendingAssets} pending</p></Card><Card><p className="text-xs font-bold uppercase tracking-wider text-ink/45">Final settlement</p><p className={`mt-2 font-display text-xl font-extrabold ${detail.settlement.settled ? "text-emerald-700" : "text-amber-700"}`}>{detail.settlement.settled ? "Paid" : "Draft"}</p><p className="mt-1 text-sm text-ink/55">Net payable {formatCurrency(detail.financialSummary.netSettlementPayable, currency)}</p></Card><Card><p className="text-xs font-bold uppercase tracking-wider text-ink/45">Separation gate</p><p className="mt-2 font-display text-xl font-extrabold text-ink">{detail.clearance.completed ? "Clear to separate" : "Clearance pending"}</p><p className="mt-1 text-sm text-ink/55">Final LWD {formatDate(detail.resignation.approvedLastWorkingDate)}</p></Card></section>
      <Card><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-display text-2xl font-extrabold">Released assets</h2><p className="mt-1 text-sm text-ink/60">For every returnable asset, record either the return or an approved recovery amount. Updating an item reopens clearance for review.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={openRelease}><Plus size={16} />Release asset</Button>{!detail.clearance.completed && <Button onClick={() => void completeClearance()} disabled={!detail.clearance.readyToComplete || busy === "complete"}>{busy === "complete" ? "Completing..." : <><CheckCircle2 size={16} />Complete clearance</>}</Button>}</div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-moss/5 text-xs uppercase tracking-wider text-ink/50"><tr><th className="px-4 py-3">Asset</th><th className="px-4 py-3">Released</th><th className="px-4 py-3">Return requirement</th><th className="px-4 py-3">Verification</th><th className="px-4 py-3">Recovery</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-line">{detail.assetReleases.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/55">No assets released yet. If no items apply, HR can still complete a reviewed zero-asset clearance.</td></tr>}{detail.assetReleases.map((release) => <tr key={release.id}><td className="px-4 py-3"><p className="font-bold text-ink">{release.assetName}</p><p className="mt-1 text-xs text-ink/50">{release.assetCategory || "Uncategorized"}</p></td><td className="px-4 py-3">{formatDate(release.releasedOn)}</td><td className="px-4 py-3">{release.returnable ? "Returnable" : "Not returnable"}</td><td className="px-4 py-3"><Badge value={release.returnStatus} /><p className="mt-1 text-xs text-ink/50">{release.returnedOn ? `Returned ${formatDate(release.returnedOn)}` : release.verifiedBy ? `Verified by ${release.verifiedBy}` : "Not verified"}</p></td><td className="px-4 py-3">{release.returnStatus === "NOT_RETURNED" ? formatCurrency(release.recoveryAmount, currency) : "—"}</td><td className="px-4 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => openReturn(release)}><Pencil size={14} />Verify</Button></td></tr>)}</tbody></table></div>{detail.clearance.completed && <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 size={17} />Asset clearance completed by {detail.clearance.completedBy || "HR"} on {formatDate(detail.clearance.completedAt?.slice(0, 10))}.</p>}</Card>
      <Card><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-fern">F&amp;F data scenario</p><h2 className="mt-1 font-display text-2xl font-extrabold">Final settlement</h2><p className="mt-1 text-sm text-ink/60">Enter encashment and any approved adjustments. Asset recovery is automatically included from the verified release records.</p></div><form className="mt-6 space-y-5" onSubmit={saveSettlement}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><Input label="Leave encashment days" type="number" min="0" step="0.5" value={settlementForm.leaveEncashmentDays} onChange={(event) => setSettlementAmount("leaveEncashmentDays", event.target.value)} /><Input label="Leave encashment amount" type="number" min="0" step="0.01" value={settlementForm.leaveEncashmentAmount} onChange={(event) => setSettlementAmount("leaveEncashmentAmount", event.target.value)} /><Input label="Notice pay recovery" type="number" min="0" step="0.01" value={settlementForm.noticePayRecovery} onChange={(event) => setSettlementAmount("noticePayRecovery", event.target.value)} /><Input label="Other earnings" type="number" min="0" step="0.01" value={settlementForm.otherEarnings} onChange={(event) => setSettlementAmount("otherEarnings", event.target.value)} /><Input label="Other deductions" type="number" min="0" step="0.01" value={settlementForm.otherDeductions} onChange={(event) => setSettlementAmount("otherDeductions", event.target.value)} /></div><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]"><Textarea label="Settlement remarks" maxLength={1200} value={settlementForm.remarks || ""} onChange={(event) => setSettlementForm((current) => ({ ...current, remarks: event.target.value }))} /><div className="rounded-xl border border-line bg-moss/5 p-4"><label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-ink"><input type="checkbox" checked={settlementForm.settled} onChange={(event) => setSettlementForm((current) => ({ ...current, settled: event.target.checked, settledOn: event.target.checked ? current.settledOn || today() : undefined }))} />Final settlement paid</label>{settlementForm.settled && <Input className="mt-3" label="Payment date" type="date" value={settlementForm.settledOn || ""} onChange={(event) => setSettlementForm((current) => ({ ...current, settledOn: event.target.value || undefined }))} />}</div></div><div className="grid gap-3 rounded-xl bg-moss/5 p-4 text-sm sm:grid-cols-3"><div><p className="text-xs font-bold uppercase text-ink/45">Total credits</p><p className="mt-1 font-display text-xl font-extrabold">{formatCurrency(detail.financialSummary.totalCredits, currency)}</p></div><div><p className="text-xs font-bold uppercase text-ink/45">Total deductions</p><p className="mt-1 font-display text-xl font-extrabold">{formatCurrency(detail.financialSummary.totalDeductions, currency)}</p></div><div><p className="text-xs font-bold uppercase text-ink/45">Net payable</p><p className="mt-1 font-display text-xl font-extrabold text-fern">{formatCurrency(detail.financialSummary.netSettlementPayable, currency)}</p></div></div><div className="flex justify-end"><Button type="submit" disabled={busy === "settlement"}>{busy === "settlement" ? "Saving..." : "Save final settlement"}</Button></div></form></Card>
      <section><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-fern">Exit reports</p><h2 className="mt-1 font-display text-2xl font-extrabold">Employee exit documents</h2><p className="mt-1 text-sm text-ink/60">Preview the completed report data, then download a print-ready PDF.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{reportCards.map((report) => { const Icon = report.icon; return <Card key={report.type} className="flex flex-col"><Icon className="text-fern" size={26} /><h3 className="mt-5 font-display text-lg font-extrabold">{documentTitle(report.type)}</h3><p className="mt-2 flex-1 text-sm leading-6 text-ink/60">{report.description}</p>{!report.enabled && <p className="mt-3 flex gap-1.5 text-xs font-semibold text-amber-700"><CircleAlert size={15} />{report.reason}</p>}<Button className="mt-5 w-full" variant="secondary" disabled={!report.enabled} onClick={() => { setDocumentError(""); setDocumentType(report.type); }}>Preview</Button></Card>; })}</div></section></>}
    <Card><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-xl font-extrabold">Asset item catalog</h2><p className="mt-1 text-sm text-ink/60">Create reusable assets such as laptop, ID card, access card, mobile handset, keys, or uniforms. A returnable item requires its recovery amount.</p></div><Button variant="secondary" onClick={() => openCatalog()}><Plus size={16} />Add asset item</Button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-moss/5 text-xs uppercase tracking-wider text-ink/50"><tr><th className="px-4 py-3">Asset item</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Returnable</th><th className="px-4 py-3">Recovery amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-line">{catalog.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink/55">Create the first reusable asset item to begin.</td></tr>}{catalog.map((asset) => <tr key={asset.id}><td className="px-4 py-3 font-bold text-ink">{asset.name}</td><td className="px-4 py-3">{asset.category || "—"}</td><td className="px-4 py-3">{asset.returnable ? "Yes" : "No"}</td><td className="px-4 py-3">{asset.returnable ? formatCurrency(asset.defaultRecoveryAmount, currency) : "—"}</td><td className="px-4 py-3"><Badge value={asset.active ? "ACTIVE" : "INACTIVE"} /></td><td className="px-4 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => openCatalog(asset)}><Pencil size={14} />Edit</Button></td></tr>)}</tbody></table></div></Card>
    <Modal open={catalogOpen} onClose={() => busy !== "catalog" && setCatalogOpen(false)} title={editingCatalog ? "Edit asset item" : "Create asset item"} description="Returnable items must have the recovery amount recorded for a lost or unreturned asset."><form className="space-y-4" onSubmit={saveCatalog}><div className="grid gap-4 sm:grid-cols-2"><Input label="Asset name" maxLength={120} value={catalogForm.name} onChange={(event) => setCatalogForm((current) => ({ ...current, name: event.target.value }))} /><Input label="Category" maxLength={80} placeholder="e.g. IT equipment" value={catalogForm.category || ""} onChange={(event) => setCatalogForm((current) => ({ ...current, category: event.target.value }))} /></div><div className="grid gap-4 sm:grid-cols-2"><label className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm font-bold text-ink"><input type="checkbox" checked={catalogForm.returnable} onChange={(event) => setCatalogForm((current) => ({ ...current, returnable: event.target.checked, defaultRecoveryAmount: event.target.checked ? current.defaultRecoveryAmount : 0 }))} />Returnable asset</label><label className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm font-bold text-ink"><input type="checkbox" checked={catalogForm.active} onChange={(event) => setCatalogForm((current) => ({ ...current, active: event.target.checked }))} />Available for new releases</label></div>{catalogForm.returnable && <Input label="Recovery amount if not returned" type="number" min="0.01" step="0.01" value={catalogForm.defaultRecoveryAmount} onChange={(event) => setCatalogForm((current) => ({ ...current, defaultRecoveryAmount: Number(event.target.value) || 0 }))} />}{catalogError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{catalogError}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setCatalogOpen(false)} disabled={busy === "catalog"}>Cancel</Button><Button type="submit" disabled={busy === "catalog"}>{busy === "catalog" ? "Saving..." : "Save asset item"}</Button></div></form></Modal>
    <Modal open={releaseOpen} onClose={() => busy !== "release" && setReleaseOpen(false)} title="Release asset for exit clearance" description="Add each asset that HR must verify before this employee is separated."><form className="space-y-4" onSubmit={saveRelease}><Select label="Asset item" value={releaseAssetId} onChange={(event) => setReleaseAssetId(event.target.value)}><option value="">Choose item</option>{activeCatalog.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}{asset.returnable ? ` · Returnable · ${formatCurrency(asset.defaultRecoveryAmount, currency)}` : " · Not returnable"}</option>)}</Select>{selectedAsset?.returnable && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">If this asset is not returned, the recovery amount is {formatCurrency(selectedAsset.defaultRecoveryAmount, currency)}. HR may only complete clearance once it is returned or recovery is recorded.</p>}<Input label="Released on" type="date" value={releasedOn} onChange={(event) => setReleasedOn(event.target.value)} /><Textarea label="Condition / serial number / note" maxLength={800} value={releaseNote} onChange={(event) => setReleaseNote(event.target.value)} />{releaseError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{releaseError}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setReleaseOpen(false)} disabled={busy === "release"}>Cancel</Button><Button type="submit" disabled={busy === "release"}>{busy === "release" ? "Releasing..." : "Add asset"}</Button></div></form></Modal>
    <Modal open={Boolean(returnRelease)} onClose={() => busy !== "return" && setReturnRelease(null)} title={`Verify ${returnRelease?.assetName || "asset"}`} description="A missing return needs its approved recovery amount before clearance can be completed."><form className="space-y-4" onSubmit={saveReturn}>{returnRelease?.returnable ? <Select label="Return status" value={returnStatus} onChange={(event) => setReturnStatus(event.target.value as AssetReturnStatus)}><option value="PENDING">Pending verification</option><option value="RETURNED">Returned</option><option value="NOT_RETURNED">Not returned — record recovery</option></Select> : <p className="rounded-xl bg-moss/5 px-4 py-3 text-sm font-semibold text-ink/70">This item is not returnable and is recorded as not required.</p>}{returnStatus === "RETURNED" && <Input label="Returned on" type="date" min={returnRelease?.releasedOn} value={returnedOn} onChange={(event) => setReturnedOn(event.target.value)} />}{returnStatus === "NOT_RETURNED" && <Input label="Recovery amount" type="number" min="0.01" step="0.01" value={recoveryAmount} onChange={(event) => setRecoveryAmount(Number(event.target.value) || 0)} />}{returnStatus !== "PENDING" && <Textarea label="Condition / verification note" maxLength={800} value={returnNote} onChange={(event) => setReturnNote(event.target.value)} />}{returnError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{returnError}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setReturnRelease(null)} disabled={busy === "return"}>Cancel</Button><Button type="submit" disabled={busy === "return"}>{busy === "return" ? "Saving..." : "Save verification"}</Button></div></form></Modal>
    <Modal open={Boolean(documentType && detail)} onClose={() => setDocumentType(null)} title={documentType ? documentTitle(documentType) : "Exit document"} description="Review the current data and download a print-ready PDF."><div className="space-y-4"><div className="flex justify-end"><Button onClick={() => void downloadDocument()}><Download size={16} />Download PDF</Button></div>{documentError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{documentError}</p>}<div className="overflow-auto rounded-xl border border-line bg-shell p-3"><div ref={documentRef}>{documentType && detail && <ExitDocument type={documentType} detail={detail} company={company} currency={currency} />}</div></div></div></Modal>
  </div>;
}
