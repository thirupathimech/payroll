import { FormEvent, useMemo, useState } from "react";
import { Clock3, Edit3, Plus, Trash2 } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";

interface Shift {
  id: number;
  name: string;
  code: string;
  startTime: string;
  durationHours: number;
  durationMinutes: number;
  active: boolean;
}

interface ShiftForm {
  name: string;
  code: string;
  startTime: string;
  durationHours: string;
  durationMinutes: string;
  active: boolean;
}

interface EndTimeResult {
  label: string;
  nextDay: boolean;
}

const initialShifts: Shift[] = [];

const initialForm: ShiftForm = {
  name: "",
  code: "",
  startTime: "09:00",
  durationHours: "8",
  durationMinutes: "0",
  active: true,
};

function toClockLabel(totalMinutes: number) {
  const minutesInDay = 24 * 60;
  const normalizedMinutes = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hour24 = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

function getStartMinutes(startTime: string) {
  const [hours, minutes] = startTime.split(":").map(Number);
  return hours * 60 + minutes;
}

function calculateEndTime(startTime: string, durationHours: number, durationMinutes: number): EndTimeResult {
  const startMinutes = getStartMinutes(startTime);
  const duration = durationHours * 60 + durationMinutes;
  const endMinutes = startMinutes + duration;

  return {
    label: toClockLabel(endMinutes),
    nextDay: endMinutes >= 24 * 60,
  };
}

function formatDuration(hours: number, minutes: number) {
  const hourLabel = hours === 1 ? "1 hour" : `${hours} hours`;
  const minuteLabel = minutes === 1 ? "1 minute" : `${minutes} minutes`;

  if (hours > 0 && minutes > 0) {
    return `${hourLabel} ${minuteLabel}`;
  }

  return hours > 0 ? hourLabel : minuteLabel;
}

function shiftToForm(shift: Shift): ShiftForm {
  return {
    name: shift.name,
    code: shift.code,
    startTime: shift.startTime,
    durationHours: String(shift.durationHours),
    durationMinutes: String(shift.durationMinutes),
    active: shift.active,
  };
}

function readDuration(form: ShiftForm) {
  return {
    hours: Math.max(0, Number(form.durationHours) || 0),
    minutes: Math.max(0, Number(form.durationMinutes) || 0),
  };
}

export function ShiftManagementPage() {
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState<ShiftForm>(initialForm);
  const [error, setError] = useState("");

  const { hours, minutes } = readDuration(form);
  const formEndTime = useMemo(
    () => calculateEndTime(form.startTime, hours, minutes),
    [form.startTime, hours, minutes],
  );

  function openCreate() {
    setEditing(null);
    setForm(initialForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(shift: Shift) {
    setEditing(shift);
    setForm(shiftToForm(shift));
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setError("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Shift name is required.");
      return;
    }

    if (hours === 0 && minutes === 0) {
      setError("Shift duration must be greater than zero.");
      return;
    }

    const payload: Shift = {
      id: editing?.id ?? Date.now(),
      name: form.name.trim(),
      code: form.code.trim(),
      startTime: form.startTime,
      durationHours: hours,
      durationMinutes: minutes,
      active: form.active,
    };

    setShifts((current) =>
      editing ? current.map((shift) => (shift.id === editing.id ? payload : shift)) : [payload, ...current],
    );
    closeModal();
  }

  function deleteShift(shift: Shift) {
    if (!window.confirm(`Delete ${shift.name}?`)) {
      return;
    }

    setShifts((current) => current.filter((item) => item.id !== shift.id));
  }

  const columns: Column<Shift>[] = [
    {
      header: "Shift Name",
      cell: (shift) => (
        <div>
          <p className="font-bold text-ink">{shift.name}</p>
          {shift.code && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">{shift.code}</p>}
        </div>
      ),
    },
    { header: "Start Time", cell: (shift) => toClockLabel(getStartMinutes(shift.startTime)) },
    {
      header: "End Time",
      cell: (shift) => {
        const endTime = calculateEndTime(shift.startTime, shift.durationHours, shift.durationMinutes);
        return (
          <span className="font-semibold text-ink">
            {endTime.label}
            {endTime.nextDay && <span className="ml-2 text-xs font-bold text-ember">(Next Day)</span>}
          </span>
        );
      },
    },
    { header: "Duration", cell: (shift) => formatDuration(shift.durationHours, shift.durationMinutes) },
    { header: "Status", cell: (shift) => <Badge value={shift.active} /> },
    {
      header: "Actions",
      cell: (shift) => (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="px-3" onClick={() => openEdit(shift)} aria-label="Edit shift">
            <Edit3 size={15} />
          </Button>
          <Button type="button" variant="danger" className="px-3" onClick={() => deleteShift(shift)} aria-label="Delete shift">
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Attendance Setup</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Shift Management</h2>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus size={18} />
            Create Shift
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-oat/70 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Configured Shifts</p>
            <p className="mt-3 font-display text-2xl font-extrabold text-ink">{shifts.length}</p>
          </div>
          <div className="rounded-3xl bg-white/75 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Active Shifts</p>
            <p className="mt-3 font-display text-2xl font-extrabold text-ink">
              {shifts.filter((shift) => shift.active).length}
            </p>
          </div>
          <div className="rounded-3xl bg-lagoon/10 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Overnight Coverage</p>
            <p className="mt-3 font-display text-2xl font-extrabold text-ink">
              {shifts.filter((shift) => calculateEndTime(shift.startTime, shift.durationHours, shift.durationMinutes).nextDay).length}
            </p>
          </div>
        </div>
      </Card>

      <DataTable
        rows={shifts}
        columns={columns}
        loading={false}
        emptyTitle="No shifts configured"
        page={0}
        totalPages={shifts.length > 0 ? 1 : 0}
        totalElements={shifts.length}
        onPageChange={() => undefined}
        getRowKey={(shift) => shift.id}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit shift" : "Create shift"}
        description="Set start time and duration to calculate the end time automatically."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Shift Name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <Input
              label="Shift Code"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_0.75fr_0.75fr]">
            <Input
              label="Start Time"
              type="time"
              required
              value={form.startTime}
              onChange={(event) => setForm({ ...form, startTime: event.target.value })}
            />
            <Input
              label="Hours"
              type="number"
              min="0"
              max="23"
              value={form.durationHours}
              onChange={(event) => setForm({ ...form, durationHours: event.target.value })}
            />
            <Input
              label="Minutes"
              type="number"
              min="0"
              max="59"
              step="1"
              value={form.durationMinutes}
              onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2 text-sm font-semibold text-ink/80">
              <span>End Time</span>
              <div className="flex min-h-[46px] items-center gap-3 rounded-2xl border border-moss/15 bg-oat/70 px-4 py-3 text-sm text-ink">
                <Clock3 size={17} className="text-fern" />
                <span className="font-bold">{formEndTime.label}</span>
                {formEndTime.nextDay && <span className="text-xs font-extrabold text-ember">(Next Day)</span>}
              </div>
            </label>
            <Select
              label="Status"
              value={String(form.active)}
              onChange={(event) => setForm({ ...form, active: event.target.value === "true" })}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
