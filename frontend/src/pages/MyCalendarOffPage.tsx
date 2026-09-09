import { useEffect, useMemo, useState } from "react";
import { CalendarHeart, CalendarOff, ChevronLeft, ChevronRight, RefreshCw, RotateCcw } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { myCalendarOffApi } from "../api/payroll";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { CalendarOffReportRow } from "../types";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", month: "short", day: "numeric" })
    .format(new Date(`${date}T00:00:00`));
}

function buildCalendarDays(month: Date) {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { date, dateKey: dateKey(date), inCurrentMonth: date.getMonth() === month.getMonth() };
  });
}

export function MyCalendarOffPage() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [holidays, setHolidays] = useState<CalendarOffReportRow[]>([]);
  const [weekOffs, setWeekOffs] = useState<CalendarOffReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const calendarStart = calendarDays[0]?.dateKey;
  const calendarEnd = calendarDays[calendarDays.length - 1]?.dateKey;
  const today = dateKey(new Date());

  useEffect(() => {
    if (!calendarStart || !calendarEnd) {
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      myCalendarOffApi.list({ type: "HOLIDAY", from: calendarStart, to: calendarEnd }),
      myCalendarOffApi.list({ type: "WEEK_OFF", from: calendarStart, to: calendarEnd }),
    ])
      .then(([holidayRows, weekOffRows]) => {
        if (!cancelled) {
          setHolidays(holidayRows);
          setWeekOffs(weekOffRows);
        }
      })
      .catch((apiError) => {
        if (!cancelled) {
          setHolidays([]);
          setWeekOffs([]);
          setError(getErrorMessage(apiError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [calendarEnd, calendarStart]);

  const holidaysByDate = useMemo(() => new Map(holidays.map((item) => [item.date, item])), [holidays]);
  const weekOffsByDate = useMemo(() => new Map(weekOffs.map((item) => [item.date, item])), [weekOffs]);
  const upcomingDays = useMemo(
    () => [...holidays, ...weekOffs].filter((item) => item.date >= today).sort((left, right) => left.date.localeCompare(right.date)).slice(0, 6),
    [holidays, today, weekOffs],
  );

  function moveMonth(amount: number) {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1));
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Personnel</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">My Holidays &amp; Week Off</h2>
            <p className="mt-2 text-sm text-ink/60">Your holiday and week-off dates, matched from the rules that apply to your profile.</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ember text-ink shadow-glow">
            <CalendarOff size={22} />
          </div>
        </div>
      </Card>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 border-b border-moss/10 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Calendar</p>
              <h3 className="mt-1 font-display text-2xl font-extrabold text-ink">{monthLabel(currentMonth)}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="px-3" onClick={() => moveMonth(-1)} aria-label="Previous month">
                <ChevronLeft size={17} />
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
                <RotateCcw size={16} /> Today
              </Button>
              <Button type="button" variant="secondary" className="px-3" onClick={() => moveMonth(1)} aria-label="Next month">
                <ChevronRight size={17} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-moss/10 bg-moss/5">
            {weekdayLabels.map((day) => <div key={day} className="px-2 py-3 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-ink/55">{day}</div>)}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const holiday = holidaysByDate.get(day.dateKey);
              const weekOff = weekOffsByDate.get(day.dateKey);
              const isToday = day.dateKey === today;
              return (
                <div
                  key={day.dateKey}
                  className={`min-h-[110px] border-b border-r border-moss/10 p-2 ${day.inCurrentMonth ? "bg-white/60" : "bg-oat/35 text-ink/35"}`}
                >
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-extrabold ${isToday ? "bg-moss text-white" : "text-ink/70"}`}>
                    {day.date.getDate()}
                  </span>
                  <div className="mt-2 space-y-1">
                    {holiday && <span title={holiday.calendarOff} className="block truncate rounded-lg bg-ember/25 px-2 py-1 text-[11px] font-bold text-ink">Holiday: {holiday.calendarOff}</span>}
                    {weekOff && <span title={weekOff.appliedVia} className="block truncate rounded-lg bg-lagoon/15 px-2 py-1 text-[11px] font-bold text-lagoon">Week off</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-ember/25 text-ink"><CalendarHeart size={19} /></div>
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">Holidays</p><p className="font-display text-2xl font-extrabold text-ink">{holidays.length}</p></div>
            </div>
            <p className="mt-3 text-sm text-ink/60">Holiday date{holidays.length === 1 ? "" : "s"} in this calendar view.</p>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-lagoon/15 text-lagoon"><CalendarOff size={19} /></div>
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">Week offs</p><p className="font-display text-2xl font-extrabold text-ink">{weekOffs.length}</p></div>
            </div>
            <p className="mt-3 text-sm text-ink/60">Week-off date{weekOffs.length === 1 ? "" : "s"} in this calendar view.</p>
          </Card>
          <Card>
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-fern">Coming up</p><h3 className="mt-1 font-display text-xl font-extrabold text-ink">Next days off</h3></div>{loading && <RefreshCw className="animate-spin text-fern" size={18} />}</div>
            <div className="mt-4 space-y-3">
              {upcomingDays.map((item) => {
                const isHoliday = holidaysByDate.has(item.date);
                return <div key={`${item.date}-${item.calendarOff}`} className="rounded-2xl border border-moss/10 bg-white/70 p-3"><p className="font-bold text-ink">{isHoliday ? item.calendarOff : "Week off"}</p><p className="mt-1 text-sm text-ink/55">{formatDate(item.date)}{!isHoliday && ` · ${item.appliedVia}`}</p></div>;
              })}
              {!loading && upcomingDays.length === 0 && <p className="rounded-2xl bg-oat/60 p-3 text-sm font-semibold text-ink/55">No upcoming days off in this calendar view.</p>}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
