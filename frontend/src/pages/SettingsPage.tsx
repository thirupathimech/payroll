import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { settingsApi } from "../api/payroll";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import type { CompanySettings } from "../types";

type SettingsForm = Omit<CompanySettings, "id" | "updatedAt">;

const initialForm: SettingsForm = {
  companyName: "",
  legalName: "",
  taxId: "",
  email: "",
  phone: "",
  address: "",
  currency: "USD",
  timezone: "UTC",
  payrollCutoffDay: 25,
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

export function SettingsPage() {
  const { refreshCurrency } = useAuth();
  const [form, setForm] = useState<SettingsForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    settingsApi
      .get()
      .then((settings) =>
        setForm({
          companyName: settings.companyName,
          legalName: settings.legalName ?? "",
          taxId: settings.taxId ?? "",
          email: settings.email ?? "",
          phone: settings.phone ?? "",
          address: settings.address ?? "",
          currency: settings.currency,
          timezone: settings.timezone,
          payrollCutoffDay: settings.payrollCutoffDay,
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.companyName.trim() || !form.currency.trim() || !form.timezone.trim()) {
      setError("Company name, currency, and timezone are required.");
      return;
    }
    if (form.payrollCutoffDay < 1 || form.payrollCutoffDay > 31) {
      setError("Payroll cutoff day must be between 1 and 31.");
      return;
    }

    setSaving(true);
    try {
      const saved = await settingsApi.update(form);
      await refreshCurrency();
      setMessage(`Settings saved for ${saved.companyName}.`);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Configuration</p>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Company Settings</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
          These settings define the payroll identity, currency, timezone, and monthly payroll cutoff.
        </p>
      </Card>

      <Card>
        {loading ? (
          <p className="text-sm font-semibold text-ink/60">Loading settings...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Company Name"
                value={form.companyName}
                onChange={(event) => setForm({ ...form, companyName: event.target.value })}
              />
              <Input
                label="Legal Name"
                value={form.legalName}
                onChange={(event) => setForm({ ...form, legalName: event.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Tax ID" value={form.taxId} onChange={(event) => setForm({ ...form, taxId: event.target.value })} />
              <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              <Input label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </div>
            <Textarea label="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            <div className="grid gap-4 md:grid-cols-3">
              <Select label="Currency" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>
                {currencyOptions.map(([code, symbol, name]) => (
                  <option key={code} value={code}>{code} ({symbol}) - {name}</option>
                ))}
              </Select>
              <Input
                label="Timezone"
                value={form.timezone}
                onChange={(event) => setForm({ ...form, timezone: event.target.value })}
              />
              <Input
                label="Payroll Cutoff Day"
                type="number"
                min="1"
                max="31"
                value={form.payrollCutoffDay}
                onChange={(event) => setForm({ ...form, payrollCutoffDay: Number(event.target.value) })}
              />
            </div>

            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}

            <Button type="submit" disabled={saving}>
              <Save size={18} />
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
