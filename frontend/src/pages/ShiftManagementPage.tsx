import { FormEvent, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Clock3, Coffee, Edit3, Plus, Trash2, X } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { shiftApi } from "../api/payroll";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import type { Shift, ShiftSegment, ShiftSegmentType } from "../types";

interface ShiftSegmentForm {
  id: string;
  type: ShiftSegmentType;
  hours: string;
  minutes: string;
  graceMinutes: string;
}

interface ShiftForm {
  name: string;
  code: string;
  startTime: string;
  segments: ShiftSegmentForm[];
  active: boolean;
}

interface EndTimeResult {
  label: string;
  nextDay: boolean;
}

interface TimelineSegment {
  id: string;
  type: ShiftSegmentType;
  startLabel: string;
  startNextDay: boolean;
  endLabel: string;
  endNextDay: boolean;
  durationLabel: string;
  graceMinutes: number;
}

const initialShifts: Shift[] = [];

const initialForm: ShiftForm = {
  name: "",
  code: "",
  startTime: "09:00",
  segments: [{ id: "segment-1", type: "WORK", hours: "8", minutes: "0", graceMinutes: "0" }],
  active: true,
};

function createSegment(type: ShiftSegmentType): ShiftSegmentForm {
  return {
    id: `segment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    hours: type === "WORK" ? "4" : "0",
    minutes: type === "WORK" ? "0" : "30",
    graceMinutes: type === "WORK" ? "0" : "0",
  };
}

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

function readPositiveNumber(value: string | number | undefined) {
  return Math.max(0, Number(value) || 0);
}

function segmentMinutes(segment: Pick<ShiftSegmentForm, "hours" | "minutes"> | Pick<ShiftSegment, "hours" | "minutes">) {
  return readPositiveNumber(segment.hours) * 60 + readPositiveNumber(segment.minutes);
}

function calculateEndTime(startTime: string, totalMinutes: number): EndTimeResult {
  const startMinutes = getStartMinutes(startTime);
  const endMinutes = startMinutes + totalMinutes;

  return {
    label: toClockLabel(endMinutes),
    nextDay: endMinutes >= 24 * 60,
  };
}

function formatDurationFromMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourLabel = hours === 1 ? "1 hour" : `${hours} hours`;
  const minuteLabel = minutes === 1 ? "1 minute" : `${minutes} minutes`;

  if (hours > 0 && minutes > 0) {
    return `${hourLabel} ${minuteLabel}`;
  }

  return hours > 0 ? hourLabel : minuteLabel;
}

function normalizeShiftSegments(shift: Shift): ShiftSegment[] {
  if (shift.segments?.length > 0) {
    return shift.segments;
  }

  return [{ type: "WORK", hours: shift.durationHours, minutes: shift.durationMinutes, graceMinutes: 0 }];
}

function shiftSegmentsToForm(shift: Shift): ShiftSegmentForm[] {
  return normalizeShiftSegments(shift).map((segment, index) => ({
    id: `segment-${shift.id}-${index}`,
    type: segment.type,
    hours: String(segment.hours),
    minutes: String(segment.minutes),
    graceMinutes: String(segment.type === "WORK" ? segment.graceMinutes ?? 0 : 0),
  }));
}

function shiftToForm(shift: Shift): ShiftForm {
  return {
    name: shift.name,
    code: shift.code,
    startTime: shift.startTime,
    segments: shiftSegmentsToForm(shift),
    active: shift.active,
  };
}

function readSegments(form: ShiftForm): ShiftSegment[] {
  return form.segments.map((segment) => ({
    type: segment.type,
    hours: readPositiveNumber(segment.hours),
    minutes: readPositiveNumber(segment.minutes),
    graceMinutes: segment.type === "WORK" ? readPositiveNumber(segment.graceMinutes) : 0,
  }));
}

function totalSegmentMinutes(segments: Array<Pick<ShiftSegment, "hours" | "minutes">>) {
  return segments.reduce((total, segment) => total + segmentMinutes(segment), 0);
}

function totalWorkMinutes(segments: Array<Pick<ShiftSegment, "type" | "hours" | "minutes">>) {
  return segments
    .filter((segment) => segment.type === "WORK")
    .reduce((total, segment) => total + segmentMinutes(segment), 0);
}

function buildTimeline(startTime: string, segments: ShiftSegment[]): TimelineSegment[] {
  let cursor = getStartMinutes(startTime);

  return segments.map((segment, index) => {
    const start = cursor;
    const duration = segmentMinutes(segment);
    const end = start + duration;
    cursor = end;

    return {
      id: `${index}-${segment.type}-${start}`,
      type: segment.type,
      startLabel: toClockLabel(start),
      startNextDay: start >= 24 * 60,
      endLabel: toClockLabel(end),
      endNextDay: end >= 24 * 60,
      durationLabel: formatDurationFromMinutes(duration),
      graceMinutes: segment.type === "WORK" ? segment.graceMinutes ?? 0 : 0,
    };
  });
}

export function ShiftManagementPage() {
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState<ShiftForm>(initialForm);
  const [error, setError] = useState("");

  const formSegments = useMemo(() => readSegments(form), [form]);
  const totalMinutes = useMemo(() => totalSegmentMinutes(formSegments), [formSegments]);
  const totalWorkMinutesForForm = useMemo(() => totalWorkMinutes(formSegments), [formSegments]);
  const formEndTime = useMemo(() => calculateEndTime(form.startTime, totalMinutes), [form.startTime, totalMinutes]);
  const formTimeline = useMemo(() => buildTimeline(form.startTime, formSegments), [form.startTime, formSegments]);

  function loadShifts() {
    setLoading(true);
    shiftApi
      .search({ page: 0, size: 500 })
      .then((page) => setShifts(page.content))
      .catch((apiError) => setError(getErrorMessage(apiError)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadShifts();
  }, []);

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

  function updateSegment(segmentId: string, updates: Partial<ShiftSegmentForm>) {
    setForm((current) => ({
      ...current,
      segments: current.segments.map((segment) => {
        if (segment.id !== segmentId) {
          return segment;
        }
        const nextSegment = { ...segment, ...updates };
        return {
          ...nextSegment,
          graceMinutes: nextSegment.type === "WORK" ? nextSegment.graceMinutes : "0",
        };
      }),
    }));
  }

  function addSegment(type: ShiftSegmentType) {
    setForm((current) => ({
      ...current,
      segments: [...current.segments, createSegment(type)],
    }));
  }

  function removeSegment(segmentId: string) {
    setForm((current) => ({
      ...current,
      segments: current.segments.filter((segment) => segment.id !== segmentId),
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Shift name is required.");
      return;
    }

    if (!form.code.trim()) {
      setError("Shift code is required.");
      return;
    }

    if (formSegments.length === 0) {
      setError("Add at least one work segment.");
      return;
    }

    if (!formSegments.some((segment) => segment.type === "WORK")) {
      setError("Shift must include at least one work segment.");
      return;
    }

    if (formSegments.some((segment) => segmentMinutes(segment) === 0)) {
      setError("Each work or break segment must be greater than zero.");
      return;
    }

    if (totalMinutes === 0) {
      setError("Shift duration must be greater than zero.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      startTime: form.startTime,
      durationHours: Math.floor(totalMinutes / 60),
      durationMinutes: totalMinutes % 60,
      segments: formSegments,
      active: form.active,
    };

    try {
      if (editing) {
        await shiftApi.update(editing.id, payload);
      } else {
        await shiftApi.create(payload);
      }
      closeModal();
      loadShifts();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  async function deleteShift(shift: Shift) {
    if (!window.confirm(`Delete ${shift.name}?`)) {
      return;
    }

    try {
      await shiftApi.deactivate(shift.id);
      loadShifts();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
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
        const endTime = calculateEndTime(shift.startTime, shift.durationHours * 60 + shift.durationMinutes);
        return (
          <span className="font-semibold text-ink">
            {endTime.label}
            {endTime.nextDay && <span className="ml-2 text-xs font-bold text-ember">(Next Day)</span>}
          </span>
        );
      },
    },
    {
      header: "Schedule",
      cell: (shift) => (
        <div className="space-y-1">
          {buildTimeline(shift.startTime, normalizeShiftSegments(shift)).map((segment) => (
            <p key={segment.id} className="text-xs font-semibold text-ink/65">
              <span className={segment.type === "WORK" ? "text-fern" : "text-ember"}>
                {segment.type === "WORK" ? "Work" : "Break"}
              </span>{" "}
              {segment.startLabel} to {segment.endLabel}
              {segment.endNextDay && <span className="ml-1 font-bold text-ember">(Next Day)</span>}
              {segment.type === "WORK" && segment.graceMinutes > 0 && (
                <span className="ml-1 text-ink/45">Grace {segment.graceMinutes}m</span>
              )}
            </p>
          ))}
        </div>
      ),
    },
    {
      header: "Total Shift Hours",
      cell: (shift) => formatDurationFromMinutes(totalWorkMinutes(normalizeShiftSegments(shift))),
    },
    {
      header: "Shift Duration",
      cell: (shift) => formatDurationFromMinutes(shift.durationHours * 60 + shift.durationMinutes),
    },
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
              {shifts.filter((shift) => calculateEndTime(shift.startTime, shift.durationHours * 60 + shift.durationMinutes).nextDay).length}
            </p>
          </div>
        </div>
      </Card>

      <DataTable
        rows={shifts}
        columns={columns}
        loading={loading}
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
        description="Set start time, add work and break blocks, and review the calculated end time."
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Shift Name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <Input
              label="Shift Code"
              required
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <Input
              label="Start Time"
              type="time"
              required
              value={form.startTime}
              onChange={(event) => setForm({ ...form, startTime: event.target.value })}
            />
            <Select
              label="Status"
              value={String(form.active)}
              onChange={(event) => setForm({ ...form, active: event.target.value === "true" })}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-bold text-ink">Shift blocks</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => addSegment("WORK")}>
                  <BriefcaseBusiness size={16} />
                  Work Hours
                </Button>
                <Button type="button" variant="secondary" onClick={() => addSegment("BREAK")}>
                  <Coffee size={16} />
                  Break Hours
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {form.segments.map((segment, index) => (
                <div key={segment.id} className="rounded-2xl border border-moss/10 bg-white/70 p-3">
                  <div className="grid gap-3 lg:grid-cols-[1fr_0.8fr_0.8fr_0.9fr_auto] lg:items-end">
                    <Select
                      label={`Block ${index + 1}`}
                      value={segment.type}
                      onChange={(event) => updateSegment(segment.id, { type: event.target.value as ShiftSegmentType })}
                    >
                      <option value="WORK">Work</option>
                      <option value="BREAK">Break</option>
                    </Select>
                    <Input
                      label="Hours"
                      type="number"
                      min="0"
                      max="23"
                      value={segment.hours}
                      onChange={(event) => updateSegment(segment.id, { hours: event.target.value })}
                    />
                    <Input
                      label="Minutes"
                      type="number"
                      min="0"
                      max="59"
                      step="1"
                      value={segment.minutes}
                      onChange={(event) => updateSegment(segment.id, { minutes: event.target.value })}
                    />
                    <Input
                      label="Grace Minutes"
                      type="number"
                      min="0"
                      max="240"
                      step="1"
                      disabled={segment.type !== "WORK"}
                      value={segment.type === "WORK" ? segment.graceMinutes : "0"}
                      onChange={(event) => updateSegment(segment.id, { graceMinutes: event.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 w-11 rounded-full p-0 text-red-700 hover:bg-red-50"
                      onClick={() => removeSegment(segment.id)}
                      aria-label="Remove block"
                    >
                      <X size={17} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <label className="block space-y-2 text-sm font-semibold text-ink/80">
              <span>Total Shift Hours</span>
              <div className="flex min-h-[46px] items-center gap-3 rounded-2xl border border-moss/15 bg-oat/70 px-4 py-3 text-sm text-ink">
                <Clock3 size={17} className="text-fern" />
                <span className="font-bold">{formatDurationFromMinutes(totalWorkMinutesForForm)}</span>
              </div>
            </label>
            <label className="block space-y-2 text-sm font-semibold text-ink/80">
              <span>End Time</span>
              <div className="flex min-h-[46px] items-center gap-3 rounded-2xl border border-moss/15 bg-oat/70 px-4 py-3 text-sm text-ink">
                <Clock3 size={17} className="text-fern" />
                <span className="font-bold">{formEndTime.label}</span>
                {formEndTime.nextDay && <span className="text-xs font-extrabold text-ember">(Next Day)</span>}
              </div>
            </label>
          </div>

          <div className="rounded-2xl border border-moss/10 bg-oat/45 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Timeline</p>
            <div className="mt-3 space-y-2">
              {formTimeline.map((segment) => (
                <div key={segment.id} className="flex flex-col gap-1 rounded-2xl bg-white/75 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    {segment.type === "WORK" ? <BriefcaseBusiness size={16} className="text-fern" /> : <Coffee size={16} className="text-ember" />}
                    <span className="font-bold text-ink">{segment.type === "WORK" ? "Work" : "Break"}</span>
                    <span className="text-sm font-semibold text-ink/55">{segment.durationLabel}</span>
                  </div>
                  <div className="text-sm font-bold text-ink">
                    {segment.startLabel}
                    {segment.startNextDay && <span className="ml-1 text-xs text-ember">(Next Day)</span>} to {segment.endLabel}
                    {segment.endNextDay && <span className="ml-1 text-xs text-ember">(Next Day)</span>}
                    {segment.type === "WORK" && segment.graceMinutes > 0 && (
                      <span className="ml-2 text-xs font-extrabold text-fern">Grace {segment.graceMinutes}m</span>
                    )}
                  </div>
                </div>
              ))}
              {formTimeline.length === 0 && <p className="text-sm font-semibold text-ink/55">Add a work block to build the timeline.</p>}
            </div>
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
