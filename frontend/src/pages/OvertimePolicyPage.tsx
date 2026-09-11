import { type FormEvent, useEffect, useMemo, useState } from "react";
import { BadgeIndianRupee, Power } from "lucide-react";
import { branchApi, departmentApi, designationApi, overtimePolicyApi } from "../api/payroll";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { Select } from "../components/ui/Select";
import { formatCurrency } from "../lib/format";
import type { Branch, Department, Designation, OvertimePayRateType, OvertimePolicy } from "../types";

export function OvertimePolicyPage() {
  const { currency } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [policies, setPolicies] = useState<OvertimePolicy[]>([]);
  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [payRateType, setPayRateType] = useState<OvertimePayRateType>("FIXED_HOURLY_AMOUNT");
  const [payRateValue, setPayRateValue] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [branchItems, departmentItems, designationPage, policyItems] = await Promise.all([
      branchApi.active(), departmentApi.active(), designationApi.search({ active: true, page: 0, size: 500 }), overtimePolicyApi.list(),
    ]);
    setBranches(branchItems);
    setDepartments(departmentItems);
    setDesignations(designationPage.content);
    setPolicies(policyItems);
    setBranchId((current) => current || String(branchItems[0]?.id ?? ""));
    setDepartmentId((current) => current || String(departmentItems[0]?.id ?? ""));
  };

  useEffect(() => { load().catch((apiError) => setError(getErrorMessage(apiError))); }, []);

  const designationOptions = useMemo(() => designations
    .filter((designation) => !departmentId || designation.departmentId === Number(departmentId))
    .map((designation) => ({ value: String(designation.id), label: designation.title, searchText: `${designation.code} ${designation.departmentName}` })), [departmentId, designations]);

  useEffect(() => {
    if (designationOptions.length && !designationOptions.some((option) => option.value === designationId)) {
      setDesignationId(designationOptions[0].value);
    }
  }, [designationId, designationOptions]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const rate = Number(payRateValue);
    if (!branchId || !departmentId || !designationId || !Number.isFinite(rate) || rate <= 0) {
      setError("Branch, department, designation, and a positive OT pay value are required.");
      return;
    }
    setSaving(true);
    try {
      await overtimePolicyApi.save({ branchId: Number(branchId), departmentId: Number(departmentId), designationId: Number(designationId), payRateType, payRateValue: rate });
      await load();
      setSuccess("OT eligibility and pay rule saved.");
      setPayRateValue("");
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSaving(false);
    }
  }

  function payRuleLabel(policy: OvertimePolicy) {
    return policy.payRateType === "SALARY_HOURLY_MULTIPLIER"
      ? `Salary hourly rate × ${policy.payRateValue}`
      : formatCurrency(policy.payRateValue, currency);
  }

  async function deactivate(policy: OvertimePolicy) {
    if (!window.confirm(`Deactivate OT eligibility for ${policy.branchName} / ${policy.departmentName} / ${policy.designationTitle}?`)) return;
    setError("");
    try {
      await overtimePolicyApi.deactivate(policy.id);
      await load();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  return <div className="space-y-6">
    <Card><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Payroll setup</p><h2 className="mt-2 font-display text-3xl font-extrabold text-ink">OT Eligibility & Pay Rate</h2><p className="mt-2 max-w-3xl text-sm text-ink/60">Only employees matching an active Branch, Department, and Designation policy can submit overtime. Choose either a fixed amount per OT hour or an employee hourly-salary multiplier; the rule is captured at approval and paid through payroll.</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-ember text-ink shadow-glow"><BadgeIndianRupee size={22} /></div></div>{(error || success) && <div className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || success}</div>}</Card>
    <Card><form className="space-y-5" onSubmit={save}><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Eligibility policy</p><h3 className="font-display text-xl font-extrabold text-ink">Employee group and OT pay rule</h3><p className="mt-1 text-sm text-ink/55">Saving an existing scope updates its pay rule and reactivates that policy.</p></div><div className="grid gap-4 md:grid-cols-3"><SearchableSelect label="Branch" value={branchId} options={branches.map((branch) => ({ value: String(branch.id), label: branch.name, searchText: branch.code }))} onChange={setBranchId} /><SearchableSelect label="Department" value={departmentId} options={departments.map((department) => ({ value: String(department.id), label: department.name, searchText: department.code }))} onChange={setDepartmentId} /><SearchableSelect label="Designation" value={designationId} options={designationOptions} onChange={setDesignationId} /></div><div className="grid max-w-2xl gap-4 md:grid-cols-2"><Select label="OT pay method" value={payRateType} onChange={(event) => setPayRateType(event.target.value as OvertimePayRateType)}><option value="FIXED_HOURLY_AMOUNT">Fixed amount per hour</option><option value="SALARY_HOURLY_MULTIPLIER">Salary hourly rate × multiplier</option></Select><div><Input label={payRateType === "SALARY_HOURLY_MULTIPLIER" ? "Salary hourly multiplier" : `OT pay amount per hour (${currency})`} type="number" min="0.01" step="0.01" placeholder={payRateType === "SALARY_HOURLY_MULTIPLIER" ? "e.g. 1 or 1.5" : "e.g. 150"} value={payRateValue} onChange={(event) => setPayRateValue(event.target.value)} /><p className="mt-1 text-xs text-ink/50">{payRateType === "SALARY_HOURLY_MULTIPLIER" ? "Payroll calculates the employee's hourly salary and applies this multiplier." : "This exact amount is paid for every approved OT hour."}</p></div></div><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save OT policy"}</Button></form></Card>
    <Card className="overflow-hidden p-0"><div className="border-b border-moss/10 p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Saved policies</p><h3 className="mt-1 font-display text-2xl font-extrabold text-ink">OT Eligible Employee Groups</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-moss/5 text-xs font-extrabold uppercase tracking-[0.14em] text-ink/55"><tr><th className="px-5 py-4">Branch</th><th className="px-5 py-4">Department</th><th className="px-5 py-4">Designation</th><th className="px-5 py-4 text-right">OT pay rule</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-moss/10">{policies.map((policy) => <tr key={policy.id} className="bg-white/45"><td className="px-5 py-4 font-semibold text-ink">{policy.branchName}</td><td className="px-5 py-4 text-ink/70">{policy.departmentName}</td><td className="px-5 py-4 text-ink/70">{policy.designationTitle}</td><td className="px-5 py-4 text-right font-bold text-ink">{payRuleLabel(policy)}</td><td className="px-5 py-4"><Badge value={policy.active ? "ACTIVE" : "INACTIVE"} /></td><td className="px-5 py-4 text-right">{policy.active ? <Button type="button" variant="ghost" className="h-9 w-9 rounded-full p-0 text-red-700 hover:bg-red-50" onClick={() => void deactivate(policy)} aria-label="Deactivate OT policy"><Power size={16} /></Button> : <span className="text-sm text-ink/45">—</span>}</td></tr>)}{policies.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm font-semibold text-ink/45">No OT eligibility policies yet.</td></tr>}</tbody></table></div></Card>
  </div>;
}
