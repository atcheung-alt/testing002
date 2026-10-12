"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X, ExternalLink, User, Building2 } from "lucide-react";
import clsx from "clsx";
import Portal from "@/components/Portal";

export type CalendarEvent = {
  id: string;
  invoiceId: string;
  name: string;
  companyName: string;
  contactPerson: string | null;
  durationMins: number;
  eventStartDate: string;
  eventStartTime: string | null;
  eventEndDate: string;
  eventEndTime: string | null;
};

type NormEvent = CalendarEvent & { start: Date; end: Date };

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MAX_LANES = 3;
const BAR_HEIGHT = 20;
const BAR_GAP = 4;
const HEADER_HEIGHT = 28;
const MORE_ROW_HEIGHT = 16;

// Every event bar uses the same styling — there's no per-event status or
// color concept anymore (that was tied to a quotation's status/manual
// override, which no longer applies now that the calendar is sourced from
// Event rows instead — see CalendarEvent above).
const BAR_STYLE = "bg-brand-50 text-brand-600";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}
function formatTime(time: string | null | undefined) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const d = new Date(2000, 0, 1, h, m);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d);
}
/** DD/MM/YYYY — the standard date format across the whole app. */
function formatEventDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
/** "1h 30m" / "1h" / "45m" — durationMins is always a whole number of
 *  minutes (see computeDurationMins in src/lib/events.ts). */
function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function normalizeEvents(events: CalendarEvent[]): NormEvent[] {
  return events.map((e) => {
    const start = startOfDay(new Date(e.eventStartDate));
    let end = e.eventEndDate ? startOfDay(new Date(e.eventEndDate)) : start;
    if (end < start) end = start;
    return { ...e, start, end };
  });
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

// Classic greedy interval-scheduling "lane" assignment so a multi-day event
// keeps the same row as it stretches across the grid, the way Google
// Calendar's month view stacks overlapping events.
function assignLanes(events: NormEvent[]): Map<string, number> {
  const sorted = [...events].sort((a, b) => {
    const byStart = a.start.getTime() - b.start.getTime();
    if (byStart !== 0) return byStart;
    return b.end.getTime() - b.start.getTime() - (a.end.getTime() - a.start.getTime());
  });
  const laneEnds: number[] = [];
  const laneOf = new Map<string, number>();
  for (const ev of sorted) {
    let placed = false;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] < ev.start.getTime()) {
        laneEnds[i] = ev.end.getTime();
        laneOf.set(ev.id, i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      laneEnds.push(ev.end.getTime());
      laneOf.set(ev.id, laneEnds.length - 1);
    }
  }
  return laneOf;
}

type Segment = {
  ev: NormEvent;
  startCol: number;
  span: number;
  lane: number;
  continuesLeft: boolean;
  continuesRight: boolean;
};

function WeekRow({
  week,
  events,
  laneOf,
  today,
  monthDate,
  onEventClick,
  onMoreClick,
}: {
  week: Date[];
  events: NormEvent[];
  laneOf: Map<string, number>;
  today: Date;
  monthDate: Date;
  onEventClick: (ev: NormEvent) => void;
  onMoreClick: (day: Date, events: NormEvent[]) => void;
}) {
  const weekStart = week[0];
  const weekEnd = week[6];

  const segments: Segment[] = events
    .filter((ev) => ev.end >= weekStart && ev.start <= weekEnd)
    .map((ev) => {
      const segStart = ev.start < weekStart ? weekStart : ev.start;
      const segEnd = ev.end > weekEnd ? weekEnd : ev.end;
      return {
        ev,
        startCol: daysBetween(weekStart, segStart),
        span: daysBetween(segStart, segEnd) + 1,
        lane: laneOf.get(ev.id) ?? 0,
        continuesLeft: ev.start < weekStart,
        continuesRight: ev.end > weekEnd,
      };
    });

  const visible = segments.filter((s) => s.lane < MAX_LANES);
  const hidden = segments.filter((s) => s.lane >= MAX_LANES);
  const hiddenByDay = week.map((_, i) => hidden.filter((s) => i >= s.startCol && i < s.startCol + s.span));

  const maxLaneUsed = visible.reduce((m, s) => Math.max(m, s.lane), -1);
  const hasMoreRow = hiddenByDay.some((h) => h.length > 0);
  const rowHeight =
    HEADER_HEIGHT + (maxLaneUsed + 1) * (BAR_HEIGHT + BAR_GAP) + (hasMoreRow ? MORE_ROW_HEIGHT : 6);

  return (
    <div className="relative grid grid-cols-7 border-t border-line" style={{ minHeight: Math.max(rowHeight, 100) }}>
      {week.map((d, i) => {
        const inMonth = d.getMonth() === monthDate.getMonth();
        const today_ = isSameDay(d, today);
        return (
          <div
            key={i}
            className={clsx(
              "border-r border-line last:border-r-0 px-1.5 pt-1.5",
              !inMonth && "bg-paper/70"
            )}
          >
            <span
              className={clsx(
                "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                today_ ? "bg-brand-600 text-white" : inMonth ? "text-ink" : "text-ink-faint"
              )}
            >
              {d.getDate()}
            </span>
          </div>
        );
      })}

      {visible.map((s) => (
        <button
          key={`${s.ev.id}-${s.startCol}`}
          type="button"
          onClick={() => onEventClick(s.ev)}
          title={`${s.ev.name} — ${s.ev.companyName}`}
          className={clsx(
            "absolute text-left text-[11px] font-medium leading-[20px] px-1.5 truncate hover:brightness-95 transition-[filter] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
            BAR_STYLE
          )}
          style={{
            top: HEADER_HEIGHT + s.lane * (BAR_HEIGHT + BAR_GAP),
            left: `calc(${(s.startCol / 7) * 100}% + 2px)`,
            width: `calc(${(s.span / 7) * 100}% - 4px)`,
            height: BAR_HEIGHT,
            borderTopLeftRadius: s.continuesLeft ? 0 : 6,
            borderBottomLeftRadius: s.continuesLeft ? 0 : 6,
            borderTopRightRadius: s.continuesRight ? 0 : 6,
            borderBottomRightRadius: s.continuesRight ? 0 : 6,
          }}
        >
          {s.continuesLeft ? "◂ " : ""}
          {s.ev.name} · {s.ev.companyName}
          {s.continuesRight ? " ▸" : ""}
        </button>
      ))}

      {week.map((d, i) =>
        hiddenByDay[i].length > 0 ? (
          <button
            key={`more-${i}`}
            type="button"
            onClick={() => onMoreClick(d, [...visible.filter((s) => i >= s.startCol && i < s.startCol + s.span).map((s) => s.ev), ...hiddenByDay[i].map((s) => s.ev)])}
            className="absolute text-[11px] font-medium text-brand-600 hover:underline px-1.5"
            style={{
              top: HEADER_HEIGHT + MAX_LANES * (BAR_HEIGHT + BAR_GAP),
              left: `${(i / 7) * 100}%`,
            }}
          >
            +{hiddenByDay[i].length} more
          </button>
        ) : null
      )}
    </div>
  );
}

function EventDetail({ ev }: { ev: NormEvent }) {
  const startTime = formatTime(ev.eventStartTime);
  const endTime = formatTime(ev.eventEndTime);
  const spansDays = !isSameDay(ev.start, ev.end);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-ink">{ev.name}</p>

      <div className="text-sm flex flex-col gap-1.5">
        <p className="flex items-center gap-1.5 text-brand-600 font-medium">
          <Building2 size={14} /> {ev.companyName}
        </p>
        {ev.contactPerson ? (
          <p className="flex items-center gap-1.5 text-ink-muted">
            <User size={14} /> {ev.contactPerson}
          </p>
        ) : (
          <p className="text-ink-faint">No contact person on file</p>
        )}
      </div>

      <div className="rounded-xl border border-line p-3 text-sm">
        <p className="text-ink">
          {formatEventDate(ev.start)}
          {startTime ? ` at ${startTime}` : ""}
        </p>
        {(spansDays || endTime) && (
          <p className="text-ink-muted mt-0.5">
            to {spansDays ? formatEventDate(ev.end) : formatEventDate(ev.start)}
            {endTime ? ` at ${endTime}` : ""}
          </p>
        )}
        <p className="text-ink-faint mt-1.5">Duration: {formatDuration(ev.durationMins)}</p>
      </div>

      <Link href={`/invoices/${ev.invoiceId}`} className="btn-secondary self-start">
        <ExternalLink size={15} /> View invoice
      </Link>
    </div>
  );
}

type ModalState =
  | { mode: "event"; event: NormEvent }
  | { mode: "day"; date: Date; events: NormEvent[] }
  | null;

export default function CalendarView({ events }: { events: CalendarEvent[] }) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [monthDate, setMonthDate] = useState(() => startOfDay(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [modal, setModal] = useState<ModalState>(null);

  const normalized = useMemo(() => normalizeEvents(events), [events]);

  const weeks = useMemo(() => getMonthGrid(monthDate), [monthDate]);
  const gridStart = weeks[0][0];
  const gridEnd = weeks[weeks.length - 1][6];

  const visibleEvents = useMemo(
    () => normalized.filter((ev) => ev.end >= gridStart && ev.start <= gridEnd),
    [normalized, gridStart, gridEnd]
  );
  const laneOf = useMemo(() => assignLanes(visibleEvents), [visibleEvents]);

  function goPrevMonth() {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function goNextMonth() {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }
  function goToday() {
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(monthDate);

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-lg font-semibold text-ink">{monthLabel}</h2>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={goToday} className="btn-secondary">
            Today
          </button>
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="Previous month"
            className="btn-secondary px-2.5"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="Next month"
            className="btn-secondary px-2.5"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-line pb-2 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {label}
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden border border-line">
        {weeks.map((week, i) => (
          <WeekRow
            key={i}
            week={week}
            events={visibleEvents}
            laneOf={laneOf}
            today={today}
            monthDate={monthDate}
            onEventClick={(ev) => setModal({ mode: "event", event: ev })}
            onMoreClick={(date, dayEvents) => setModal({ mode: "day", date, events: dayEvents })}
          />
        ))}
      </div>

      {normalized.length === 0 && (
        <p className="text-sm text-ink-muted mt-4">
          Nothing on the calendar yet — set an event date on an invoice, then use &quot;Mark on
          calendar&quot; from the invoice page and it&apos;ll show up here.
        </p>
      )}

      {modal && (
        <Portal>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4 animate-fade-in"
          onClick={() => setModal(null)}
        >
          <div className="card p-6 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-ink">
                {modal.mode === "event" ? "Event details" : formatEventDate(modal.date)}
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="text-ink-faint hover:text-ink transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {modal.mode === "event" ? (
              <EventDetail ev={modal.event} />
            ) : (
              <div className="flex flex-col divide-y divide-line">
                {modal.events.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setModal({ mode: "event", event: ev })}
                    className="flex items-center justify-between gap-3 py-2.5 text-left hover:bg-paper -mx-1 px-1 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ev.name}</p>
                      <p className="text-xs text-ink-muted truncate mt-0.5">{ev.companyName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
