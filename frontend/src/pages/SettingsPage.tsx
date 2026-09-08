import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Landmark, MapPin, Save, WalletCards } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { settingsApi } from "../api/payroll";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import type { CompanySettings, WeekDayName } from "../types";

type SettingsForm = Omit<CompanySettings, "id" | "updatedAt">;

const initialForm: SettingsForm = {
  companyName: "",
  legalName: "",
  taxId: "",
  email: "",
  phone: "",
  website: "",
  registrationNumber: "",
  gstin: "",
  panNumber: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  address: "",
  currency: "USD",
  timezone: "UTC",
  payrollCutoffDay: 25,
  payrollFrequency: "MONTHLY",
  payrollDisbursementDay: 1,
  weekStartDay: "MONDAY",
};

const currencyOptions = [
  ["USD", "$", "US Dollar"],
  ["INR", "₹", "Indian Rupee"],
  ["EUR", "€", "Euro"],
  ["GBP", "£", "British Pound"],
  ["AED", "د.إ", "UAE Dirham"],
  ["SAR", "﷼", "Saudi Riyal"],
  ["SGD", "S$", "Singapore Dollar"],
  ["AUD", "A$", "Australian Dollar"],
  ["CAD", "CA$", "Canadian Dollar"],
  ["JPY", "¥", "Japanese Yen"],
  ["CNY", "¥", "Chinese Yuan"],
] as const;

const timezoneOptions = [
  ["Asia/Kolkata", "India Standard Time"],
  ["Asia/Dubai", "Gulf Standard Time"],
  ["Asia/Singapore", "Singapore Standard Time"],
  ["Europe/London", "United Kingdom Time"],
  ["Europe/Berlin", "Central European Time"],
  ["America/New_York", "Eastern Time"],
  ["America/Chicago", "Central Time"],
  ["America/Los_Angeles", "Pacific Time"],
  ["UTC", "Coordinated Universal Time"],
] as const;

const weekDays: Array<[WeekDayName, string]> = [
  ["MONDAY", "Monday"], ["TUESDAY", "Tuesday"], ["WEDNESDAY", "Wednesday"], ["THURSDAY", "Thursday"],
  ["FRIDAY", "Friday"], ["SATURDAY", "Saturday"], ["SUNDAY", "Sunday"],
];

function SectionTitle({ icon: Icon, eyebrow, title, description }: { icon: typeof Building2; eyebrow: string; title: string; description: string }) {
  return <div className="mb-5 flex items-start gap-3">
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ember text-ink"><Icon size={19} /></div>
    <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-fern">{eyebrow}</p><h3 className="mt-1 font-display text-xl font-extrabold text-ink">{title}</h3><p className="mt-1 text-sm leading-5 text-ink/60">{description}</p></div>
  </div>;
}

export function SettingsPage() {
  const { refreshCurrency, user } = useAuth();
  const [form, setForm] = useState<SettingsForm>(initialForm);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    settingsApi
      .get()
      .then((settings) => {
        setForm({
          companyName: settings.companyName,
          legalName: settings.legalName ?? "",
          taxId: settings.taxId ?? "",
          email: settings.email ?? "",
          phone: settings.phone ?? "",
          website: settings.website ?? "",
          registrationNumber: settings.registrationNumber ?? "",
          gstin: settings.gstin ?? "",
          panNumber: settings.panNumber ?? "",
          addressLine1: settings.addressLine1 ?? settings.address ?? "",
          addressLine2: settings.addressLine2 ?? "",
          city: settings.city ?? "",
          state: settings.state ?? "",
          postalCode: settings.postalCode ?? "",
          country: settings.country ?? "",
          address: settings.address ?? "",
          currency: settings.currency,
          timezone: settings.timezone,
          payrollCutoffDay: settings.payrollCutoffDay,
          payrollFrequency: settings.payrollFrequency ?? "MONTHLY",
          payrollDisbursementDay: settings.payrollDisbursementDay ?? 1,
          weekStartDay: settings.weekStartDay ?? "MONDAY",
        });
        setUpdatedAt(settings.updatedAt);
      })
      .catch((apiError) => setError(getErrorMessage(apiError)))
      .finally(() => setLoading(false));
  }, []);

  const timezoneValues = useMemo(() => new Set<string>(timezoneOptions.map(([value]) => value)), []);
  const savedAtLabel = updatedAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(updatedAt)) : "Not saved yet";

  function updateField<K extends keyof SettingsForm>(field: K, value: SettingsForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.companyName.trim() || !form.currency.trim() || !form.timezone.trim()) {
      setError("Company name, currency, and timezone are required.");
      return;
    }
    if (form.payrollCutoffDay < 1 || form.payrollCutoffDay > 31 || form.payrollDisbursementDay < 1 || form.payrollDisbursementDay > 31) {
      setError("Payroll cutoff day and salary credit day must be between 1 and 31.");
      return;
    }

    setSaving(true);
    try {
      const saved = await settingsApi.update(form);
      await refreshCurrency();
      setUpdatedAt(saved.updatedAt);
      setMessage(`Company settings saved for ${saved.companyName}.`);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Card><p className="text-sm font-semibold text-ink/60">Loading company settings...</p></Card>;
  }

  return <div className="space-y-6">
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Configuration</p><h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Company Settings</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">Maintain the organisation information used across payroll, employee documents, reports, and statutory records.</p></div>
        <div className="rounded-2xl bg-moss/5 px-4 py-3 text-sm"><p className="font-bold text-ink">Organisation code: <span className="text-fern">{user?.orgCode || "-"}</span></p><p className="mt-1 text-xs font-medium text-ink/55">Last saved: {savedAtLabel}</p></div>
      </div>
    </Card>

    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <SectionTitle icon={Building2} eyebrow="Identity & contact" title="Organisation profile" description="This name and contact information appears in company-facing documents and reports." />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Company display name" required maxLength={180} value={form.companyName} onChange={(event) => updateField("companyName", event.target.value)} />
          <Input label="Legal entity name" maxLength={220} value={form.legalName} onChange={(event) => updateField("legalName", event.target.value)} />
          <Input label="Company email" type="email" maxLength={160} value={form.email} onChange={(event) => updateField("email", event.target.value)} />
          <Input label="Company phone" type="tel" maxLength={40} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
          <Input label="Website" type="url" placeholder="https://example.com" maxLength={160} value={form.website} onChange={(event) => updateField("website", event.target.value)} />
          <Input label="Tax ID / TIN" maxLength={80} value={form.taxId} onChange={(event) => updateField("taxId", event.target.value)} />
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Landmark} eyebrow="Compliance" title="Registration & tax details" description="Keep the identifiers required for statutory filings and payroll documents in one place." />
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Registration / CIN number" maxLength={80} value={form.registrationNumber} onChange={(event) => updateField("registrationNumber", event.target.value)} />
          <Input label="PAN" className="uppercase" maxLength={20} value={form.panNumber} onChange={(event) => updateField("panNumber", event.target.value.toUpperCase())} />
          <Input label="GSTIN" className="uppercase" maxLength={20} value={form.gstin} onChange={(event) => updateField("gstin", event.target.value.toUpperCase())} />
        </div>
      </Card>

      <Card>
        <SectionTitle icon={MapPin} eyebrow="Registered address" title="Office & statutory address" description="The formatted address is automatically available to report and payslip headers." />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Address line 1" maxLength={250} value={form.addressLine1} onChange={(event) => updateField("addressLine1", event.target.value)} />
          <Input label="Address line 2" maxLength={250} value={form.addressLine2} onChange={(event) => updateField("addressLine2", event.target.value)} />
          <Input label="City" maxLength={100} value={form.city} onChange={(event) => updateField("city", event.target.value)} />
          <Input label="State / Province" maxLength={100} value={form.state} onChange={(event) => updateField("state", event.target.value)} />
          <Input label="Postal code" maxLength={20} value={form.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} />
          <Input label="Country" maxLength={80} value={form.country} onChange={(event) => updateField("country", event.target.value)} />
        </div>
      </Card>

      <Card>
        <SectionTitle icon={WalletCards} eyebrow="Payroll calendar" title="Payroll defaults" description="These values set the operating calendar for your organisation. A day beyond a month’s last date uses that month’s final day." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Select label="Currency" value={form.currency} onChange={(event) => updateField("currency", event.target.value)}>
            {currencyOptions.map(([code, symbol, name]) => <option key={code} value={code}>{code} ({symbol}) — {name}</option>)}
          </Select>
          <Select label="Timezone" value={form.timezone} onChange={(event) => updateField("timezone", event.target.value)}>
            {!timezoneValues.has(form.timezone) && <option value={form.timezone}>{form.timezone}</option>}
            {timezoneOptions.map(([value, label]) => <option key={value} value={value}>{label} ({value})</option>)}
          </Select>
          <Select label="Payroll frequency" value={form.payrollFrequency} onChange={(event) => updateField("payrollFrequency", event.target.value as SettingsForm["payrollFrequency"])}>
            <option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Biweekly</option><option value="MONTHLY">Monthly</option>
          </Select>
          <Input label="Payroll cutoff day" type="number" min="1" max="31" value={form.payrollCutoffDay} onChange={(event) => updateField("payrollCutoffDay", Number(event.target.value) || 0)} />
          <Input label="Salary credit day" type="number" min="1" max="31" value={form.payrollDisbursementDay} onChange={(event) => updateField("payrollDisbursementDay", Number(event.target.value) || 0)} />
          <Select label="Week starts on" value={form.weekStartDay} onChange={(event) => updateField("weekStartDay", event.target.value as WeekDayName)}>
            {weekDays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </div>
      </Card>

      {(error || message) && <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</p>}

      <div className="flex justify-end"><Button type="submit" disabled={saving}><Save size={18} />{saving ? "Saving..." : "Save company settings"}</Button></div>
    </form>
  </div>;
}
