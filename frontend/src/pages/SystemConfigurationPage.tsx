import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { attendanceApi, employeeSettingsApi } from "../api/payroll";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import type { AttendanceMode, AttendanceSettings, EmployeeCodeMode, EmployeeSettings } from "../types";

const initialAttendance: AttendanceSettings = { attendanceMode: "MANUAL", biometricEnabled: false };
const initialEmployeeSettings: EmployeeSettings = {
  id: 0,
  codeMode: "MANUAL",
  prefix: "EMP",
  suffix: "",
  startingNumber: 1,
  padding: 4,
  updatedAt: "",
};

function previewCode(settings: EmployeeSettings) {
  const number = String(settings.startingNumber || 0).padStart(settings.padding || 1, "0");
  return `${settings.prefix || ""}${number}${settings.suffix || ""}`;
}

export function SystemConfigurationPage() {
  const [attendance, setAttendance] = useState<AttendanceSettings>(initialAttendance);
  const [employeeSettings, setEmployeeSettings] = useState<EmployeeSettings>(initialEmployeeSettings);
  const [loading, setLoading] = useState(true);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([attendanceApi.getSettings(), employeeSettingsApi.get()])
      .then(([attendanceSettings, codeSettings]) => {
        setAttendance(attendanceSettings);
        setEmployeeSettings(codeSettings);
      })
      .catch((apiError) => setError(getErrorMessage(apiError)))
      .finally(() => setLoading(false));
  }, []);

  async function saveAttendance() {
    setError("");
    setMessage("");
    setSavingAttendance(true);
    try {
      const saved = await attendanceApi.updateSettings(attendance);
      setAttendance(saved);
      setMessage("Attendance configuration saved.");
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSavingAttendance(false);
    }
  }

  async function saveEmployeeSettings() {
    setError("");
    setMessage("");
    if (employeeSettings.codeMode === "AUTO" && employeeSettings.padding <= 0) {
      setError("Number padding must be greater than zero.");
      return;
    }
    setSavingEmployee(true);
    try {
      const saved = await employeeSettingsApi.update({
        codeMode: employeeSettings.codeMode,
        prefix: employeeSettings.prefix,
        suffix: employeeSettings.suffix,
        startingNumber: employeeSettings.startingNumber,
        padding: employeeSettings.padding,
      });
      setEmployeeSettings(saved);
      setMessage("Employee code configuration saved.");
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setSavingEmployee(false);
    }
  }

  if (loading) {
    return <Card><p className="text-sm font-semibold text-ink/60">Loading system configuration...</p></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">System configuration</p>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">System Configuration</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
          Manage the attendance source and employee code generation rules for your organization.
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Attendance</p>
          <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">Attendance mode</h3>
          <p className="mt-2 text-sm text-ink/60">Choose how employee attendance enters the system.</p>
          <div className="mt-5 space-y-4">
            <Select label="Attendance mode" value={attendance.attendanceMode} onChange={(event) => setAttendance({ ...attendance, attendanceMode: event.target.value as AttendanceMode })}>
              <option value="MANUAL">Manual attendance</option>
              <option value="PUNCHES">Punches based</option>
            </Select>
            {attendance.attendanceMode === "PUNCHES" && (
              <>
                <Input label="Biometric name" value={attendance.biometricName || ""} onChange={(event) => setAttendance({ ...attendance, biometricName: event.target.value })} />
                <Input label="Device/API URL" value={attendance.biometricUrl || ""} onChange={(event) => setAttendance({ ...attendance, biometricUrl: event.target.value })} />
                <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <input type="checkbox" checked={attendance.biometricEnabled} onChange={(event) => setAttendance({ ...attendance, biometricEnabled: event.target.checked })} />
                  Enable biometric sync (every 10 seconds)
                </label>
              </>
            )}
            <Button onClick={saveAttendance} disabled={savingAttendance}><Save size={17} />{savingAttendance ? "Saving..." : "Save attendance settings"}</Button>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Employees</p>
          <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">Employee code mode</h3>
          <p className="mt-2 text-sm text-ink/60">Choose whether employee codes are generated automatically or entered manually.</p>
          <div className="mt-5 space-y-4">
            <Select label="Employee Code Mode" value={employeeSettings.codeMode} onChange={(event) => setEmployeeSettings({ ...employeeSettings, codeMode: event.target.value as EmployeeCodeMode })}>
              <option value="AUTO">Auto Generate</option>
              <option value="MANUAL">Manual Entry</option>
            </Select>
            {employeeSettings.codeMode === "AUTO" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Prefix" value={employeeSettings.prefix} onChange={(event) => setEmployeeSettings({ ...employeeSettings, prefix: event.target.value })} />
                  <Input label="Suffix" value={employeeSettings.suffix} onChange={(event) => setEmployeeSettings({ ...employeeSettings, suffix: event.target.value })} />
                  <Input label="Starting Number" type="number" min="0" value={employeeSettings.startingNumber} onChange={(event) => setEmployeeSettings({ ...employeeSettings, startingNumber: Number(event.target.value) || 0 })} />
                  <Input label="Number Padding" type="number" min="1" value={employeeSettings.padding} onChange={(event) => setEmployeeSettings({ ...employeeSettings, padding: Number(event.target.value) || 1 })} />
                </div>
                <div className="rounded-3xl bg-oat/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Generated Code Preview</p>
                  <p className="mt-2 font-display text-2xl font-extrabold text-ink">{previewCode(employeeSettings)}</p>
                </div>
              </>
            )}
            <Button onClick={saveEmployeeSettings} disabled={savingEmployee}><Save size={17} />{savingEmployee ? "Saving..." : "Save employee code settings"}</Button>
          </div>
        </Card>
      </div>

      {(error || message) && <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</p>}
    </div>
  );
}
