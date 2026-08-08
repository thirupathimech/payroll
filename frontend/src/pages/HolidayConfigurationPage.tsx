import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarHeart, Trash2 } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { branchApi, departmentApi, designationApi, holidayApi } from "../api/payroll";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { formatDate } from "../lib/format";
import { hasRoleAccess, HR_ROLES } from "../lib/access";
import type { Branch, Department, Designation, Holiday } from "../types";

export function HolidayConfigurationPage() {
  const { user } = useAuth();
  const canManage = hasRoleAccess(user, HR_ROLES) || user?.role === "MANAGER";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([branchApi.active(), departmentApi.active(), designationApi.search({ active: true, page: 0, size: 500 }), holidayApi.search()])
      .then(([branchItems, departmentItems, designationPage, holidayItems]) => {
        setBranches(branchItems); setDepartments(departmentItems); setDesignations(designationPage.content); setHolidays(holidayItems);
        setBranchId(String(branchItems[0]?.id ?? "")); setDepartmentId(String(departmentItems[0]?.id ?? "")); setDesignationId(String(designationPage.content[0]?.id ?? ""));
      }).catch((apiError) => setError(getErrorMessage(apiError)));
  }, []);

  const designationOptions = useMemo(() => designations.filter((item) => !departmentId || item.departmentId === Number(departmentId))
    .map((item) => ({ value: String(item.id), label: item.title, searchText: `${item.code} ${item.departmentName}` })), [designations, departmentId]);

  useEffect(() => {
    if (designationOptions.length && !designationOptions.some((item) => item.value === designationId)) setDesignationId(designationOptions[0].value);
  }, [designationId, designationOptions]);

  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!branchId || !departmentId || !designationId || !date || !title.trim()) { setError("Branch, department, designation, date, and holiday title are required."); return; }
    try {
      setSaving(true); await holidayApi.create({ branchId: Number(branchId), departmentId: Number(departmentId), designationId: Number(designationId), date, title: title.trim() });
      setHolidays(await holidayApi.search()); setTitle(""); setSuccess("Holiday saved.");
    } catch (apiError) { setError(getErrorMessage(apiError)); } finally { setSaving(false); }
  }

  async function remove(holiday: Holiday) {
    if (!window.confirm("Delete this holiday?")) return;
    try { await holidayApi.delete(holiday.id); setHolidays(await holidayApi.search()); } catch (apiError) { setError(getErrorMessage(apiError)); }
  }

  return <div className="space-y-6">
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Attendance Setup</p><h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Holiday Configuration</h2></div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ember text-ink shadow-glow"><CalendarHeart size={22} /></div>
      </div>
      {(error || success) && <div className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || success}</div>}
    </Card>
    {canManage && <Card><form onSubmit={save} className="space-y-5">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Rule</p><h3 className="font-display text-xl font-extrabold text-ink">Branch / Department / Designation</h3><p className="mt-1 text-sm text-ink/55">Set a holiday for this employee group.</p></div>
      <div className="grid gap-4 md:grid-cols-3">
        <SearchableSelect label="Branch" value={branchId} options={branches.map((item) => ({ value: String(item.id), label: item.name, searchText: item.code }))} onChange={setBranchId} />
        <SearchableSelect label="Department" value={departmentId} options={departments.map((item) => ({ value: String(item.id), label: item.name, searchText: item.code }))} onChange={setDepartmentId} />
        <SearchableSelect label="Designation" value={designationId} options={designationOptions} onChange={setDesignationId} />
      </div>
      <div className="grid gap-4 md:grid-cols-2"><Input label="Holiday Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><Input label="Holiday Title" placeholder="e.g. Independence Day" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : "Save Holiday"}</Button>
    </form></Card>}
    <Card className="overflow-hidden p-0"><div className="border-b border-moss/10 p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Saved</p><h3 className="mt-1 font-display text-2xl font-extrabold text-ink">Holiday Rules</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-moss/5 text-xs font-extrabold uppercase tracking-[0.14em] text-ink/55"><tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Holiday</th><th className="px-5 py-4">Branch</th><th className="px-5 py-4">Department</th><th className="px-5 py-4">Designation</th><th className="px-5 py-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-moss/10">{holidays.map((item) => <tr key={item.id} className="bg-white/45"><td className="px-5 py-4 font-semibold text-ink">{formatDate(item.date)}</td><td className="px-5 py-4 font-bold text-ink">{item.title}</td><td className="px-5 py-4 text-ink/70">{item.branchName}</td><td className="px-5 py-4 text-ink/70">{item.departmentName}</td><td className="px-5 py-4 text-ink/70">{item.designationTitle}</td><td className="px-5 py-4 text-right"><Button type="button" variant="ghost" className="h-9 w-9 rounded-full p-0 text-red-700 hover:bg-red-50" onClick={() => remove(item)} aria-label="Delete holiday"><Trash2 size={16} /></Button></td></tr>)}{holidays.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm font-semibold text-ink/45">No holidays found.</td></tr>}</tbody></table></div></Card>
  </div>;
}
