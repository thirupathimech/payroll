import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Edit3, Plus, Save, ToggleLeft, ToggleRight, WalletCards } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { employeeApi, salaryApi } from "../api/payroll";
import { useAuth } from "../auth/AuthContext";
import { EmployeeAutocomplete } from "../components/ui/EmployeeAutocomplete";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import type {
  Employee,
  EmployeeSalaryComponent,
  EmployeeSalaryResponse,
  SalaryComponent,
  SalaryComponentCategory,
  SalaryComponentPayload,
  SalaryValueType,
} from "../types";

type ComponentForm = SalaryComponentPayload;

const MONTHS_IN_YEAR = 12;
const MINOR_UNITS_PER_CURRENCY = 100;
const PERCENTAGE_BASIS_POINTS = 10_000n;

const initialComponent: ComponentForm = {
  name: "",
  code: "",
  category: "EARNING",
  valueType: "PERCENTAGE",
  defaultValue: 0,
  enabled: true,
};

const salaryCategoryLabels: Record<SalaryComponentCategory, string> = {
  EARNING: "Earning",
  EMPLOYER_CONTRIBUTION: "Employer contribution",
  DEDUCTION: "Deduction",
};

function categoryLabel(category: SalaryComponentCategory) {
  return salaryCategoryLabels[category];
}

function categoryBadgeClassName(category: SalaryComponentCategory) {
  switch (category) {
    case "EARNING":
      return "bg-emerald-50 text-emerald-800";
    case "EMPLOYER_CONTRIBUTION":
      return "bg-violet-50 text-violet-800";
    case "DEDUCTION":
      return "bg-rose-50 text-rose-800";
  }
}

function roundMoney(value: number) {
  const minorUnits = toMinorUnits(value);
  return minorUnits === 0 ? 0 : minorUnits / MINOR_UNITS_PER_CURRENCY;
}

function toMinorUnits(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return Math.round((safeValue + Number.EPSILON) * MINOR_UNITS_PER_CURRENCY);
}

function allocationUnitsFor(component: EmployeeSalaryComponent, annualCtc: number) {
  const value = Number(component.value) || 0;
  const valueMinorUnits = BigInt(toMinorUnits(value));
  return component.valueType === "PERCENTAGE"
    ? BigInt(toMinorUnits(annualCtc)) * valueMinorUnits
    : valueMinorUnits * PERCENTAGE_BASIS_POINTS;
}

function totalAllocationUnits(components: EmployeeSalaryComponent[], annualCtc: number) {
  return components.reduce((total, component) => total + allocationUnitsFor(component, annualCtc), 0n);
}

function amountFromAllocationUnits(allocationUnits: bigint) {
  const sign = allocationUnits < 0n ? -1 : 1;
  const absoluteUnits = allocationUnits < 0n ? -allocationUnits : allocationUnits;
  const minorUnits = (absoluteUnits + PERCENTAGE_BASIS_POINTS / 2n) / PERCENTAGE_BASIS_POINTS;
  const amount = (sign * Number(minorUnits)) / MINOR_UNITS_PER_CURRENCY;
  return amount === 0 ? 0 : amount;
}

function amountFor(component: EmployeeSalaryComponent, annualCtc: number) {
  return amountFromAllocationUnits(allocationUnitsFor(component, annualCtc));
}

function totalAmountFor(components: EmployeeSalaryComponent[], annualCtc: number) {
  return amountFromAllocationUnits(totalAllocationUnits(components, annualCtc));
}

function displayedAnnualTotalFor(components: EmployeeSalaryComponent[], annualCtc: number) {
  return components.reduce((total, component) => total + toMinorUnits(amountFor(component, annualCtc)), 0) / MINOR_UNITS_PER_CURRENCY;
}

function displayedMonthlyTotalFor(components: EmployeeSalaryComponent[], annualCtc: number) {
  return components.reduce((total, component) => total + toMinorUnits(monthlyAmount(amountFor(component, annualCtc))), 0) / MINOR_UNITS_PER_CURRENCY;
}

function monthlyAmount(annualAmount: number) {
  return roundMoney(annualAmount / MONTHS_IN_YEAR);
}

function formatSalaryCurrency(value: number, currency: string) {
  const options = {
    style: "currency" as const,
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  try {
    return new Intl.NumberFormat("en-IN", options).format(roundMoney(value));
  } catch {
    return new Intl.NumberFormat("en-IN", { ...options, currency: "USD" }).format(roundMoney(value));
  }
}

function formatAllocationPercentage(value: number, ctcFullyAllocated: boolean) {
  return `${value.toFixed(ctcFullyAllocated ? 2 : 4)}%`;
}

interface SalaryBreakdownProps {
  annualCtc: number;
  currency: string;
  earnings: EmployeeSalaryComponent[];
  employerContributions: EmployeeSalaryComponent[];
  deductions: EmployeeSalaryComponent[];
  earningsTotal: number;
  employerContributionTotal: number;
  deductionsTotal: number;
  ctcComponentsTotal: number;
  allocationPercentage: number;
  allocationBalance: number;
  ctcFullyAllocated: boolean;
}

interface SalaryBreakdownSectionProps {
  annualCtc: number;
  currency: string;
  items: EmployeeSalaryComponent[];
  total: number;
  title: string;
  totalLabel: string;
  emptyMessage: string;
  headerClassName: string;
  adjustmentClassName: string;
  totalClassName: string;
}

function SalaryBreakdownSection({
  annualCtc,
  currency,
  items,
  total,
  title,
  totalLabel,
  emptyMessage,
  headerClassName,
  adjustmentClassName,
  totalClassName,
}: SalaryBreakdownSectionProps) {
  const annualAdjustment = roundMoney(total - displayedAnnualTotalFor(items, annualCtc));
  const monthlyAdjustment = roundMoney(monthlyAmount(total) - displayedMonthlyTotalFor(items, annualCtc));
  const hasRoundingAdjustment = annualAdjustment !== 0 || monthlyAdjustment !== 0;

  return (
    <>
      <tr className={headerClassName}>
        <td className="px-5 py-2.5" colSpan={3}>{title}</td>
      </tr>
      {items.map((item) => {
        const annualAmount = amountFor(item, annualCtc);
        return (
          <tr key={item.componentId}>
            <th scope="row" className="px-5 py-3 font-semibold text-ink">
              <span className="block">{item.name}</span>
              <span className="mt-0.5 block text-xs font-medium text-ink/45">
                {item.valueType === "PERCENTAGE" ? `${item.value}% of annual CTC` : "Annual fixed amount"}
              </span>
            </th>
            <td className="px-3 py-3 text-right font-medium text-ink/75">{formatSalaryCurrency(annualAmount, currency)}</td>
            <td className="px-5 py-3 text-right font-medium text-ink/75">{formatSalaryCurrency(monthlyAmount(annualAmount), currency)}</td>
          </tr>
        );
      })}
      {items.length === 0 && <tr><td colSpan={3} className="px-5 py-3 text-ink/50">{emptyMessage}</td></tr>}
      {hasRoundingAdjustment && (
        <tr className={adjustmentClassName}>
          <th className="px-5 py-2.5">Rounding adjustment</th>
          <td className="px-3 py-2.5 text-right">{formatSalaryCurrency(annualAdjustment, currency)}</td>
          <td className="px-5 py-2.5 text-right">{formatSalaryCurrency(monthlyAdjustment, currency)}</td>
        </tr>
      )}
      <tr className={totalClassName}>
        <th className="px-5 py-3">{totalLabel}</th>
        <td className="px-3 py-3 text-right">{formatSalaryCurrency(total, currency)}</td>
        <td className="px-5 py-3 text-right">{formatSalaryCurrency(monthlyAmount(total), currency)}</td>
      </tr>
    </>
  );
}

function SalaryBreakdown({
  annualCtc,
  currency,
  earnings,
  employerContributions,
  deductions,
  earningsTotal,
  employerContributionTotal,
  deductionsTotal,
  ctcComponentsTotal,
  allocationPercentage,
  allocationBalance,
  ctcFullyAllocated,
}: SalaryBreakdownProps) {
  const takeHome = roundMoney(earningsTotal - deductionsTotal);
  const ctcAnnualAdjustment = roundMoney(ctcComponentsTotal - earningsTotal - employerContributionTotal);
  const ctcMonthlyAdjustment = roundMoney(monthlyAmount(ctcComponentsTotal) - monthlyAmount(earningsTotal) - monthlyAmount(employerContributionTotal));
  const hasCtcRoundingAdjustment = ctcAnnualAdjustment !== 0 || ctcMonthlyAdjustment !== 0;
  const allocationMessage = annualCtc <= 0
    ? "Enter an annual CTC to calculate the breakup."
    : ctcFullyAllocated
      ? "All enabled earnings and employer contributions add up to 100% of the annual CTC."
      : allocationBalance === 0
        ? "Adjust the earning and employer contribution values so the allocation reaches an exact 100%."
      : allocationBalance > 0
        ? `${formatSalaryCurrency(allocationBalance, currency)} is still unallocated.`
        : `${formatSalaryCurrency(Math.abs(allocationBalance), currency)} is over allocated.`;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-moss/10 px-5 py-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Live calculation</p>
        <h3 className="mt-1 font-display text-2xl font-extrabold text-ink">Salary Breakup</h3>
        <p className="mt-1 text-sm leading-5 text-ink/55">Annual CTC includes enabled earnings and employer contributions. Employee deductions are shown separately and reduce take-home only.</p>
      </div>

      <div className="max-h-[calc(100vh-10rem)] overflow-auto">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead className="sticky top-0 bg-white/95 text-xs font-extrabold uppercase tracking-[0.12em] text-ink/45 backdrop-blur-sm">
            <tr>
              <th className="px-5 py-3">Component</th>
              <th className="px-3 py-3 text-right">Yearly</th>
              <th className="px-5 py-3 text-right">Monthly</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-moss/10">
            <tr className="bg-moss/5 font-bold text-ink">
              <th className="px-5 py-3">Annual CTC</th>
              <td className="px-3 py-3 text-right">{formatSalaryCurrency(annualCtc, currency)}</td>
              <td className="px-5 py-3 text-right">{formatSalaryCurrency(monthlyAmount(annualCtc), currency)}</td>
            </tr>

            <SalaryBreakdownSection
              annualCtc={annualCtc}
              currency={currency}
              items={earnings}
              total={earningsTotal}
              title="Earnings"
              totalLabel="Gross earnings"
              emptyMessage="No enabled earnings selected."
              headerClassName="bg-emerald-50/75 text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-800"
              adjustmentClassName="bg-emerald-50/50 text-xs font-semibold text-emerald-900"
              totalClassName="bg-emerald-50 font-extrabold text-emerald-950"
            />

            <SalaryBreakdownSection
              annualCtc={annualCtc}
              currency={currency}
              items={employerContributions}
              total={employerContributionTotal}
              title="Employer contributions (part of CTC)"
              totalLabel="Total employer contributions"
              emptyMessage="No enabled employer contributions selected."
              headerClassName="bg-violet-50/75 text-xs font-extrabold uppercase tracking-[0.12em] text-violet-800"
              adjustmentClassName="bg-violet-50/50 text-xs font-semibold text-violet-900"
              totalClassName="bg-violet-50 font-extrabold text-violet-950"
            />
            {hasCtcRoundingAdjustment && (
              <tr className="bg-lagoon/10 text-xs font-semibold text-ink">
                <th className="px-5 py-2.5">CTC rounding adjustment</th>
                <td className="px-3 py-2.5 text-right">{formatSalaryCurrency(ctcAnnualAdjustment, currency)}</td>
                <td className="px-5 py-2.5 text-right">{formatSalaryCurrency(ctcMonthlyAdjustment, currency)}</td>
              </tr>
            )}
            <tr className="bg-lagoon/15 font-extrabold text-ink">
              <th className="px-5 py-3">Total CTC components</th>
              <td className="px-3 py-3 text-right">{formatSalaryCurrency(ctcComponentsTotal, currency)}</td>
              <td className="px-5 py-3 text-right">{formatSalaryCurrency(monthlyAmount(ctcComponentsTotal), currency)}</td>
            </tr>

            <SalaryBreakdownSection
              annualCtc={annualCtc}
              currency={currency}
              items={deductions}
              total={deductionsTotal}
              title="Employee deductions (outside CTC)"
              totalLabel="Total deductions"
              emptyMessage="No enabled deductions selected."
              headerClassName="bg-rose-50/75 text-xs font-extrabold uppercase tracking-[0.12em] text-rose-800"
              adjustmentClassName="bg-rose-50/50 text-xs font-semibold text-rose-900"
              totalClassName="bg-rose-50 font-extrabold text-rose-950"
            />
            <tr className={takeHome < 0 ? "bg-red-100 font-extrabold text-red-950" : "bg-moss font-extrabold text-white"}>
              <th className="px-5 py-3">Estimated take-home</th>
              <td className="px-3 py-3 text-right">{formatSalaryCurrency(takeHome, currency)}</td>
              <td className="px-5 py-3 text-right">{formatSalaryCurrency(monthlyAmount(takeHome), currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={`border-t px-5 py-4 ${ctcFullyAllocated ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-extrabold">CTC allocation</p>
          <p className="font-display text-xl font-extrabold">{formatAllocationPercentage(allocationPercentage, ctcFullyAllocated)}</p>
        </div>
        <p className="mt-1 text-xs font-semibold leading-5">{allocationMessage}</p>
      </div>
    </Card>
  );
}

export function SalaryPage() {
  const { currency } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [profile, setProfile] = useState<EmployeeSalaryResponse | null>(null);
  const [employeeCode, setEmployeeCode] = useState("");
  const [ctc, setCtc] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [componentModalOpen, setComponentModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
  const [componentForm, setComponentForm] = useState<ComponentForm>(initialComponent);
  const [componentSaving, setComponentSaving] = useState(false);
  const employeeSelectionRequestRef = useRef(0);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [employeePage, salaryComponents] = await Promise.all([
        employeeApi.search({ status: "ACTIVE", page: 0, size: 1000 }),
        salaryApi.components(),
      ]);
      setEmployees(employeePage.content);
      setComponents(salaryComponents);
      setError("");
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.employeeCode === employeeCode),
    [employeeCode, employees],
  );

  async function selectEmployee(code: string) {
    const requestId = ++employeeSelectionRequestRef.current;
    setEmployeeCode(code);
    const employee = employees.find((item) => item.employeeCode === code);
    if (!employee) {
      setProfile(null);
      setCtc("");
      setLoadingProfile(false);
      setError("");
      setNotice("");
      return;
    }
    setProfile(null);
    setCtc("");
    setLoadingProfile(true);
    setError("");
    setNotice("");
    try {
      const nextProfile = await salaryApi.employee(employee.id);
      if (requestId !== employeeSelectionRequestRef.current) {
        return;
      }
      setProfile(nextProfile);
      setCtc(String(nextProfile.ctc ?? employee.baseSalary ?? ""));
    } catch (apiError) {
      if (requestId !== employeeSelectionRequestRef.current) {
        return;
      }
      setError(getErrorMessage(apiError));
      setProfile(null);
    } finally {
      if (requestId === employeeSelectionRequestRef.current) {
        setLoadingProfile(false);
      }
    }
  }

  function updateRow(componentId: number, changes: Partial<EmployeeSalaryComponent>) {
    setProfile((current) => current ? {
      ...current,
      components: current.components.map((item) => item.componentId === componentId ? { ...item, ...changes } : item),
    } : current);
  }

  const parsedCtc = Number(ctc);
  const ctcNumber = Number.isFinite(parsedCtc) ? parsedCtc : 0;
  const earnings = useMemo(() => profile?.components.filter((item) => item.category === "EARNING" && item.enabled) ?? [], [profile]);
  const employerContributions = useMemo(() => profile?.components.filter((item) => item.category === "EMPLOYER_CONTRIBUTION" && item.enabled) ?? [], [profile]);
  const deductions = useMemo(() => profile?.components.filter((item) => item.category === "DEDUCTION" && item.enabled) ?? [], [profile]);
  const ctcMinorUnits = toMinorUnits(ctcNumber);
  const ctcAllocationUnits = BigInt(ctcMinorUnits) * PERCENTAGE_BASIS_POINTS;
  const earningsAllocationUnits = totalAllocationUnits(earnings, ctcNumber);
  const employerContributionAllocationUnits = totalAllocationUnits(employerContributions, ctcNumber);
  const ctcComponentsAllocationUnits = earningsAllocationUnits + employerContributionAllocationUnits;
  const earningsTotal = totalAmountFor(earnings, ctcNumber);
  const employerContributionTotal = totalAmountFor(employerContributions, ctcNumber);
  const deductionsTotal = totalAmountFor(deductions, ctcNumber);
  const ctcComponentsTotal = amountFromAllocationUnits(ctcComponentsAllocationUnits);
  const allocationBalanceUnits = ctcAllocationUnits - ctcComponentsAllocationUnits;
  const allocationBalance = amountFromAllocationUnits(allocationBalanceUnits);
  const allocationPercentage = ctcAllocationUnits > 0n ? Number((ctcComponentsAllocationUnits * 1_000_000n) / ctcAllocationUnits) / 10_000 : 0;
  const ctcFullyAllocated = ctcMinorUnits > 0 && allocationBalanceUnits === 0n;
  const estimatedTakeHome = roundMoney(earningsTotal - deductionsTotal);

  async function saveSalary(event: FormEvent) {
    event.preventDefault();
    if (!profile || !selectedEmployee) {
      setError("Select an employee before saving salary.");
      return;
    }
    if (ctcNumber <= 0) {
      setError("CTC must be greater than zero.");
      return;
    }
    if (!ctcFullyAllocated) {
      setError("Enabled earnings and employer contributions must add up to exactly 100% of the annual CTC before saving.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await salaryApi.saveEmployee(selectedEmployee.id, {
        ctc: ctcNumber,
        components: profile.components.map((item) => ({
          componentId: item.componentId,
          valueType: item.valueType,
          value: Number(item.value) || 0,
          enabled: item.enabled,
        })),
      });
      setProfile(saved);
      setCtc(String(saved.ctc));
      setNotice("Salary structure saved successfully.");
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSaving(false);
    }
  }

  function openNewComponent() {
    setEditingComponent(null);
    setComponentForm(initialComponent);
    setError("");
    setComponentModalOpen(true);
  }

  function openEditComponent(component: SalaryComponent) {
    setEditingComponent(component);
    setComponentForm({
      name: component.name,
      code: component.code,
      category: component.category,
      valueType: component.valueType,
      defaultValue: component.defaultValue,
      enabled: component.enabled,
    });
    setError("");
    setComponentModalOpen(true);
  }

  async function saveComponent(event: FormEvent) {
    event.preventDefault();
    if (!componentForm.name.trim() || !componentForm.code.trim()) {
      setError("Component name and code are required.");
      return;
    }
    if (componentForm.defaultValue < 0 || (componentForm.valueType === "PERCENTAGE" && componentForm.defaultValue > 100)) {
      setError(componentForm.valueType === "PERCENTAGE" ? "Percentage must be between 0 and 100." : "Value cannot be negative.");
      return;
    }
    setComponentSaving(true);
    setError("");
    try {
      const saved = editingComponent
        ? await salaryApi.updateComponent(editingComponent.id, componentForm)
        : await salaryApi.createComponent(componentForm);
      setComponents((current) => editingComponent ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setProfile((current) => {
        if (!current) return current;
        const exists = current.components.some((item) => item.componentId === saved.id);
        return exists ? {
          ...current,
          components: current.components.map((item) => item.componentId === saved.id ? {
            ...item,
            name: saved.name,
            code: saved.code,
            category: saved.category,
            valueType: saved.valueType,
            enabled: saved.enabled ? item.enabled : false,
          } : item),
        } : {
          ...current,
          components: [...current.components, {
            componentId: saved.id,
            name: saved.name,
            code: saved.code,
            category: saved.category,
            valueType: saved.valueType,
            value: saved.defaultValue,
            enabled: saved.category === "EMPLOYER_CONTRIBUTION" ? false : saved.enabled,
          }],
        };
      });
      setComponentModalOpen(false);
      setNotice(editingComponent ? "Salary component updated." : "Salary component created and added to the selected employee.");
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setComponentSaving(false);
    }
  }

  async function toggleMasterComponent(component: SalaryComponent) {
    try {
      const saved = await salaryApi.updateComponent(component.id, {
        name: component.name,
        code: component.code,
        category: component.category,
        valueType: component.valueType,
        defaultValue: component.defaultValue,
        enabled: !component.enabled,
      });
      setComponents((current) => current.map((item) => item.id === saved.id ? saved : item));
      const profileEmployeeId = profile?.employeeId;
      if (profileEmployeeId) {
        const refreshedProfile = await salaryApi.employee(profileEmployeeId);
        const refreshedComponent = refreshedProfile.components.find((item) => item.componentId === saved.id);
        if (refreshedComponent) {
          setProfile((current) => current?.employeeId === profileEmployeeId ? {
            ...current,
            components: current.components.map((item) => item.componentId === saved.id ? { ...item, enabled: refreshedComponent.enabled } : item),
          } : current);
        }
      }
      setNotice(`${saved.name} is now ${saved.enabled ? "available" : "unavailable"} for salary structures.`);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  function renderComponentRows(rows: EmployeeSalaryComponent[], category: SalaryComponentCategory) {
    const filtered = rows.filter((item) => item.category === category);
    const emptyMessage = `No ${categoryLabel(category).toLowerCase()} components configured.`;
    return (
      <div className="space-y-3">
        {filtered.length === 0 ? <p className="rounded-2xl bg-ink/5 px-4 py-5 text-sm text-ink/55">{emptyMessage}</p> : filtered.map((item) => {
          const catalogEnabled = components.find((component) => component.id === item.componentId)?.enabled ?? true;

          return (
            <div key={item.componentId} className="grid gap-3 rounded-2xl border border-moss/10 bg-white/75 p-4 sm:grid-cols-2 sm:items-end">
              <div className="min-w-0 sm:col-span-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words font-bold text-ink">{item.name}</p>
                  {!catalogEnabled && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-800">Unavailable in catalog</span>}
                </div>
                <p className="mt-1 break-words text-xs font-bold uppercase tracking-[0.15em] text-ink/40">{item.code}</p>
              </div>
              <Select
                label="Calculation"
                value={item.valueType}
                disabled={!catalogEnabled}
                className="disabled:cursor-not-allowed disabled:bg-ink/5"
                onChange={(event) => updateRow(item.componentId, { valueType: event.target.value as SalaryValueType })}
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed amount</option>
              </Select>
              <Input
                label={item.valueType === "PERCENTAGE" ? "% of annual CTC" : "Annual fixed amount"}
                type="number"
                min="0"
                max={item.valueType === "PERCENTAGE" ? "100" : undefined}
                step="0.01"
                value={item.value}
                disabled={!catalogEnabled}
                className="disabled:cursor-not-allowed disabled:bg-ink/5"
                onChange={(event) => updateRow(item.componentId, { value: Number(event.target.value) })}
              />
              <div className="min-w-0 rounded-2xl bg-moss/5 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">Annual amount</p>
                <p className="mt-1 break-words font-display text-base font-extrabold leading-tight tabular-nums text-ink sm:text-lg">{formatSalaryCurrency(amountFor(item, ctcNumber), currency)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={!catalogEnabled}
                aria-pressed={item.enabled}
                aria-label={`${item.name} is ${item.enabled ? "enabled" : "disabled"}.${catalogEnabled ? ` Select to ${item.enabled ? "disable" : "enable"} it.` : " Enable it in the salary component catalog first."}`}
                title={catalogEnabled ? item.enabled ? "Disable component" : "Enable component" : "Enable this component in the catalog first"}
                className={`h-12 w-full border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${item.enabled ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus-visible:outline-emerald-600" : "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 focus-visible:outline-rose-600"}`}
                onClick={() => updateRow(item.componentId, { enabled: !item.enabled })}
              >
                {item.enabled ? <ToggleRight size={18} className="text-emerald-700" /> : <ToggleLeft size={18} className="text-rose-700" />}
                {item.enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="relative z-30 overflow-visible">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Payroll setup</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Salary Management</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
              Create an employee-wise CTC structure with flexible percentage or fixed components. Earnings and employer
              contributions together make up CTC; employee deductions stay separate and reduce take-home only.
            </p>
          </div>
          <Button type="button" onClick={openNewComponent}><Plus size={18} />New component</Button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
          <EmployeeAutocomplete label="Employee" value={employeeCode} employees={employees} onChange={selectEmployee} />
          <div className="rounded-2xl bg-moss/5 px-4 py-3 text-sm text-ink/60">
            <p className="font-bold text-ink">{loading ? "Loading employees..." : `${employees.length} active employees`}</p>
          </div>
        </div>
      </Card>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {notice && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p>}

      {profile ? (
        <form onSubmit={saveSalary} className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
            <div className="space-y-6">
              <Card>
                <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-moss text-white"><WalletCards size={23} /></div>
                    <div className="min-w-0">
                      <h3 className="break-words font-display text-2xl font-extrabold text-ink">{profile.employeeName}</h3>
                      <p className="break-words text-sm font-semibold text-ink/55">
                        {profile.employeeCode} · {profile.designationTitle} · {profile.departmentName}{profile.branchName ? ` · ${profile.branchName}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="w-full 2xl:w-80 2xl:shrink-0">
                    <Input label="Annual CTC" type="number" min="1" step="0.01" value={ctc} onChange={(event) => setCtc(event.target.value)} />
                    <p className="mt-2 text-xs font-semibold leading-5 text-ink/50">
                      Enabled earnings and employer contributions must allocate 100% of the annual CTC.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-3">
                  <div className="min-w-0 rounded-2xl bg-lagoon/10 px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-lagoon">Annual CTC</p>
                    <p className="mt-1 break-words font-display text-xl font-extrabold leading-tight tabular-nums text-ink">{formatSalaryCurrency(ctcNumber, currency)}</p>
                  </div>
                  <div className="min-w-0 rounded-2xl bg-emerald-50 px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Gross earnings</p>
                    <p className="mt-1 break-words font-display text-xl font-extrabold leading-tight tabular-nums text-emerald-900">{formatSalaryCurrency(earningsTotal, currency)}</p>
                  </div>
                  <div className="min-w-0 rounded-2xl bg-violet-50 px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-700">Employer contribution</p>
                    <p className="mt-1 break-words font-display text-xl font-extrabold leading-tight tabular-nums text-violet-900">{formatSalaryCurrency(employerContributionTotal, currency)}</p>
                  </div>
                  <div className="min-w-0 rounded-2xl bg-rose-50 px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-rose-700">Employee deductions</p>
                    <p className="mt-1 break-words font-display text-xl font-extrabold leading-tight tabular-nums text-rose-900">{formatSalaryCurrency(deductionsTotal, currency)}</p>
                  </div>
                  <div className={estimatedTakeHome < 0 ? "min-w-0 rounded-2xl bg-red-100 px-4 py-4" : "min-w-0 rounded-2xl bg-ink/5 px-4 py-4"}>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink/50">Estimated take-home</p>
                    <p className="mt-1 break-words font-display text-xl font-extrabold leading-tight tabular-nums text-ink">{formatSalaryCurrency(estimatedTakeHome, currency)}</p>
                  </div>
                </div>

                <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${ctcFullyAllocated ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                  <div className="flex flex-col gap-1 2xl:flex-row 2xl:items-center 2xl:justify-between">
                    <p className="font-extrabold">CTC allocated: {formatAllocationPercentage(allocationPercentage, ctcFullyAllocated)}</p>
                    <p className="font-semibold">
                      {ctcNumber <= 0
                        ? "Enter annual CTC to begin."
                        : ctcFullyAllocated
                          ? "Ready to save."
                          : allocationBalance === 0
                            ? "Adjust the earning and employer contribution values to reach an exact 100% allocation."
                            : allocationBalance > 0
                              ? `${formatSalaryCurrency(allocationBalance, currency)} remaining to allocate.`
                              : `${formatSalaryCurrency(Math.abs(allocationBalance), currency)} over allocated.`}
                    </p>
                  </div>
                  <p className="mt-1 text-xs font-medium leading-5">CTC = gross earnings + employer contributions. Employee deductions are outside CTC and reduce take-home.</p>
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-display text-2xl font-extrabold text-ink">Earnings</h3>
                    <p className="text-sm text-ink/55">Amounts paid to the employee. Together with employer contributions, enabled rows must equal the annual CTC.</p>
                  </div>
                  <div className="shrink-0"><Badge value={`${earnings.length} active`} /></div>
                </div>
                {renderComponentRows(profile.components, "EARNING")}
              </Card>

              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-display text-2xl font-extrabold text-ink">Employer contributions</h3>
                    <p className="text-sm text-ink/55">Employer-paid costs such as PF, ESI, or gratuity. They count toward CTC but do not increase take-home.</p>
                  </div>
                  <div className="shrink-0"><Badge value={`${employerContributions.length} active`} /></div>
                </div>
                {renderComponentRows(profile.components, "EMPLOYER_CONTRIBUTION")}
              </Card>

              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-display text-2xl font-extrabold text-ink">Deductions</h3>
                    <p className="text-sm text-ink/55">Employee deductions are outside CTC and reduce the estimated take-home amount only.</p>
                  </div>
                  <div className="shrink-0"><Badge value={`${deductions.length} active`} /></div>
                </div>
                {renderComponentRows(profile.components, "DEDUCTION")}
              </Card>

              <div className="flex flex-col items-end gap-2">
                {!ctcFullyAllocated && <p className="text-sm font-semibold text-amber-800">Allocate the full annual CTC before saving.</p>}
                <Button type="submit" disabled={saving || loadingProfile || !ctcFullyAllocated}>
                  <Save size={18} />{saving ? "Saving..." : "Save salary structure"}
                </Button>
              </div>
            </div>

            <aside className="xl:sticky xl:top-24 xl:self-start">
              <SalaryBreakdown
                annualCtc={ctcNumber}
                currency={currency}
                earnings={earnings}
                employerContributions={employerContributions}
                deductions={deductions}
                earningsTotal={earningsTotal}
                employerContributionTotal={employerContributionTotal}
                deductionsTotal={deductionsTotal}
                ctcComponentsTotal={ctcComponentsTotal}
                allocationPercentage={allocationPercentage}
                allocationBalance={allocationBalance}
                ctcFullyAllocated={ctcFullyAllocated}
              />
            </aside>
          </div>
        </form>
      ) : (
        <Card className="py-16 text-center">
          <WalletCards className="mx-auto text-moss/35" size={46} />
          <h3 className="mt-4 font-display text-2xl font-extrabold text-ink">Select an employee</h3>
          <p className="mt-2 text-sm text-ink/55">Choose an employee above to create or edit their salary structure.</p>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-display text-2xl font-extrabold text-ink">Salary component catalog</h3>
            <p className="text-sm text-ink/55">Employer contribution components are selected per employee and count toward CTC, not take-home.</p>
          </div>
          <span className="shrink-0 text-sm font-bold text-ink/50">{components.length} components</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {components.map((component) => (
            <div key={component.id} className="flex items-center justify-between gap-3 rounded-2xl border border-moss/10 bg-white/70 p-4">
              <div className="min-w-0">
                <p className="break-words font-bold text-ink">{component.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ink/40">
                  <span>{component.code}</span>
                  <span aria-hidden="true">·</span>
                  <span className={`rounded-full px-2 py-0.5 normal-case tracking-normal ${categoryBadgeClassName(component.category)}`}>{categoryLabel(component.category)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{component.valueType}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  aria-pressed={component.enabled}
                  aria-label={`${component.name} is ${component.enabled ? "enabled" : "disabled"}. Select to ${component.enabled ? "disable" : "enable"} it.`}
                  className={`h-10 w-10 border p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${component.enabled ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus-visible:outline-emerald-600" : "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 focus-visible:outline-rose-600"}`}
                  onClick={() => toggleMasterComponent(component)}
                  title={component.enabled ? "Disable component" : "Enable component"}
                >
                  {component.enabled ? <ToggleRight className="text-emerald-700" size={21} /> : <ToggleLeft className="text-rose-700" size={21} />}
                </Button>
                <Button type="button" variant="ghost" className="h-10 w-10 p-0" onClick={() => openEditComponent(component)} title="Edit component">
                  <Edit3 size={17} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={componentModalOpen}
        onClose={() => setComponentModalOpen(false)}
        title={editingComponent ? "Edit salary component" : "Create salary component"}
        description="Use a clear code so the component is easy to identify in payroll reports."
      >
        <form onSubmit={saveComponent} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Component name" value={componentForm.name} onChange={(event) => setComponentForm({ ...componentForm, name: event.target.value })} placeholder="Basic salary" />
            <Input label="Component code" value={componentForm.code} onChange={(event) => setComponentForm({ ...componentForm, code: event.target.value.toUpperCase() })} placeholder="BASIC" />
            <Select label="Category" value={componentForm.category} onChange={(event) => setComponentForm({ ...componentForm, category: event.target.value as SalaryComponentCategory })}>
              <option value="EARNING">Earning</option>
              <option value="EMPLOYER_CONTRIBUTION">Employer contribution</option>
              <option value="DEDUCTION">Deduction</option>
            </Select>
            <Select label="Value type" value={componentForm.valueType} onChange={(event) => setComponentForm({ ...componentForm, valueType: event.target.value as SalaryValueType })}>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed amount</option>
            </Select>
            <Input label="Default value" type="number" min="0" max={componentForm.valueType === "PERCENTAGE" ? "100" : undefined} step="0.01" value={componentForm.defaultValue} onChange={(event) => setComponentForm({ ...componentForm, defaultValue: Number(event.target.value) })} />
          </div>
          {componentForm.category === "EMPLOYER_CONTRIBUTION" && (
            <p className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-900">Employer contributions are part of CTC but are excluded from take-home pay.</p>
          )}
          <label className="flex items-center gap-3 text-sm font-semibold text-ink/75">
            <input type="checkbox" checked={componentForm.enabled} onChange={(event) => setComponentForm({ ...componentForm, enabled: event.target.checked })} />
            Available for new salary structures
          </label>
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setComponentModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={componentSaving}>{componentSaving ? "Saving..." : editingComponent ? "Save changes" : "Create component"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
