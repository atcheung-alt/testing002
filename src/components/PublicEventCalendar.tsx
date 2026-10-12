"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import clsx from "clsx";
import { dateKey, availabilityLevel, readJsonOrThrow, type AvailabilityLevel } from "@/lib/bookingFormat";

// A month-grid date picker for one event's public booking page — shows
// at-a-glance availability per day ("open / few left / fully booked")
// within that event's own [minDate, maxDate] date range, so a client can see
// where to look before drilling into a specific date's time list. Adapted
// from the old single-resource booking calendar, now scoped per event and
// bounded to that event's own bookable range rather than "any future day".
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const LEVEL_STYLES: Record<AvailabilityLevel, string> = {
  OPEN: "bg-brand-50 text-brand-700 border-brand-300 hover:border-brand-500 hover:bg-brand-100",
  FEW: "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400 hover:bg-amber-100",
  FULL: "bg-paper text-ink-faint border-line",
};
const LEVEL_LABELS: Record<AvailabilityLevel, string> = {
  OPEN: "Open",
  FEW: "Few left",
  FULL: "Full",
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthGrid(monthDate: Date): Date[][] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());
  const gridEnd = addDays(lastOfMonth, 6 - lastOfMonth.getDay());

  const days: Date[] = [];
  for (let cur = gridStart; cur <= gridEnd; cur = addDays(cur, 1)) {
    days.push(cur);
  }
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export default function PublicEventCalendar({
  eventId,
  minDate,
  maxDate,
  selectedDate,
  onSelectDate,
}: {
  eventId: string;
  minDate: Date;
  maxDate: Date;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const initialMonth = useMemo(() => {
    const start = startOfDay(minDate) > today ? minDate : today;
    return startOfDay(new Date(start.getFullYear(), start.getMonth(), 1));
  }, [minDate, today]);
  const [monthDate, setMonthDate] = useState(initialMonth);
  const [availability, setAvailability] = useState<Record<string, { total: number; available: number }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/public/bookings/events/${eventId}/availability?month=${monthKey(monthDate)}`)
      .then(async (res) => {
        const data = await readJsonOrThrow(res, "Could not load availability.");
        if (!cancelled) setAvailability(data.days || {});
      })
      .catch((err: any) => {
        if (!cancelled) {
          setAvailability({});
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, monthDate]);

  const weeks = useMemo(() => getMonthGrid(monthDate), [monthDate]);
  const atFirstMonth = isSameMonth(monthDate, initialMonth) || monthDate < initialMonth;
  const atLastMonth = isSameMonth(monthDate, maxDate) || monthDate > maxDate;

  function goPrevMonth() {
    if (atFirstMonth) return;
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function goNextMonth() {
    if (atLastMonth) return;
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(monthDate);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-display text-base font-semibold text-ink">{monthLabel}</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goPrevMonth}
            disabled={atFirstMonth}
            aria-label="Previous month"
            className="btn-secondary px-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={goNextMonth}
            disabled={atLastMonth}
            aria-label="Next month"
            className="btn-secondary px-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flatMap((week, wi) =>
          week.map((d, di) => {
            const inMonth = isSameMonth(d, monthDate);
            const isToday = isSameDay(d, today);
            const outOfRange = startOfDay(d).getTime() < startOfDay(minDate).getTime() || startOfDay(d).getTime() > startOfDay(maxDate).getTime() || startOfDay(d).getTime() < today.getTime();
            const key = dateKey(d);
            const isSelected = selectedDate === key;
            const info = availability[key];
            const level = info ? availabilityLevel(info.available, info.total) : null;
            const disabled = !inMonth || outOfRange || level === "FULL";
            const showLoading = inMonth && !outOfRange && loading && !info;

            return (
              <button
                key={`${wi}-${di}`}
                type="button"
                disabled={disabled || showLoading}
                onClick={() => onSelectDate(key)}
                title={level ? LEVEL_LABELS[level] : undefined}
                className={clsx(
                  "flex flex-col items-center justify-center gap-0.5 rounded-lg border py-1.5 text-xs transition-colors min-h-[46px]",
                  !inMonth && "border-transparent text-ink-faint/50 cursor-default",
                  inMonth && outOfRange && "border-transparent text-ink-faint/70 cursor-not-allowed",
                  inMonth && !outOfRange && !level && "border-line text-ink cursor-default",
                  inMonth && !outOfRange && level && LEVEL_STYLES[level],
                  isSelected && "ring-2 ring-brand-600 ring-offset-1"
                )}
              >
                <span className={clsx("font-medium", isToday && "text-brand-700")}>{d.getDate()}</span>
                {showLoading ? (
                  <Loader2 size={10} className="animate-spin text-ink-faint" />
                ) : inMonth && !outOfRange && level ? (
                  <span className="text-[9px] leading-none">{LEVEL_LABELS[level]}</span>
                ) : null}
              </button>
            );
          })
        )}
      </div>

      {error && <p className="text-xs text-danger-600 mt-2">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-100 border border-brand-300" /> Open
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-100 border border-amber-300" /> Few left
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-paper border border-line" /> Full
        </span>
      </div>
    </div>
  );
}
