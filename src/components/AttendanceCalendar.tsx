"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";
import clsx from "clsx";
import Portal from "@/components/Portal";

// A read-only leave calendar — every APPROVED LeaveRequest, laid out month by
// month so HR can see at a glance who's out on any given day. Deliberately
// not a general attendance/clock-in system: there's no data entry here at
// all, it's purely a visualization of leave that's already been approved via
// the existing employee leave-request flow (see /hr/employees/[id] and the
// public /leave/{token} link). This mirrors the month-grid/lane-stacking
// approach CalendarView.tsx uses for quotation events, trimmed down (no
// color picker, no PATCH endpoint — nothing here is editable).
export type LeaveEvent = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeTitle: string;
  reason: string;
  startDate: string;
  endDate: string;
};

type NormEvent = LeaveEvent & { start: Date; end: Date };

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MAX_LANES = 3;
const BAR_HEIGHT = 20;
const BAR_GAP = 4;
const HEADER_HEIGHT = 28;
const MORE_ROW_HEIGHT = 16;

// A fixed palette, picked deterministically per employee (see colorFor
// below) purely so two different people on leave the same week are easy to
// tell apart at a glance — not stored anywhere, not user-editable.
const EMPLOYEE_COLORS: { bg: string; text: string }[] = [
  { bg: "#4F7CFF", text: "#FFFFFF" },
  { bg: "#22D3EE", text: "#083344" },
  { bg: "#9B6BEA", text: "#FFFFFF" },
  { bg: "#34A853", text: "#FFFFFF" },
  { bg: "#F2A93B", text: "#3A2600" },
  { bg: "#E35D6A", text: "#FFFFFF" },
  { bg: "#66708A", text: "#FFFFFF" },
];

function colorFor(employeeId: string) {
  let hash = 0;
  for (let i = 0; i < employeeId.length; i++) {
    hash = (hash * 31 + employeeId.charCodeAt(i)) >>> 0;
  }
  return EMPLOYEE_COLORS[hash % EMPLOYEE_COLORS.length];
}

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
/** DD/MM/YYYY — the standard date format across the whole app. */
function formatEventDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function normalizeEvents(events: LeaveEvent[]): NormEvent[] {
  return events.map((e) => {
    const start = startOfDay(new Date(e.startDate));
    let end = startOfDay(new Date(e.endDate));
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

// Classic greedy interval-scheduling "lane" assignment so a multi-day leave
// span keeps the same row as it stretches across the grid, the way Google
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
            className={clsx("border-r border-line last:border-r-0 px-1.5 pt-1.5", !inMonth && "bg-paper/70")}
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

      {visible.map((s) => {
        const color = colorFor(s.ev.employeeId);
        return (
          <button
            key={`${s.ev.id}-${s.startCol}`}
            type="button"
            onClick={() => onEventClick(s.ev)}
            title={`${s.ev.employeeName} — on leave`}
            className="absolute text-left text-[11px] font-medium leading-[20px] px-1.5 truncate hover:brightness-95 transition-[filter] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
            style={{
              top: HEADER_HEIGHT + s.lane * (BAR_HEIGHT + BAR_GAP),
              left: `calc(${(s.startCol / 7) * 100}% + 2px)`,
              width: `calc(${(s.span / 7) * 100}% - 4px)`,
              height: BAR_HEIGHT,
              borderTopLeftRadius: s.continuesLeft ? 0 : 6,
              borderBottomLeftRadius: s.continuesLeft ? 0 : 6,
              borderTopRightRadius: s.continuesRight ? 0 : 6,
              borderBottomRightRadius: s.continuesRight ? 0 : 6,
              backgroundColor: color.bg,
              color: color.text,
            }}
          >
            {s.continuesLeft ? "◂ " : ""}
            {s.ev.employeeName}
            {s.continuesRight ? " ▸" : ""}
          </button>
        );
      })}

      {week.map((d, i) =>
        hiddenByDay[i].length > 0 ? (
          <button
            key={`more-${i}`}
            type="button"
            onClick={() =>
              onMoreClick(d, [
                ...visible.filter((s) => i >= s.startCol && i < s.startCol + s.span).map((s) => s.ev),
                ...hiddenByDay[i].map((s) => s.ev),
              ])
            }
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

function LeaveDetail({ ev }: { ev: NormEvent }) {
  const spansDays = !isSameDay(ev.start, ev.end);
  const color = colorFor(ev.employeeId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color.bg }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink truncate">{ev.employeeName}</p>
          {ev.employeeTitle && <p className="text-xs text-ink-muted truncate">{ev.employeeTitle}</p>}
        </div>
      </div>

      <div className="rounded-xl border border-line p-3 text-sm">
        <p className="text-ink">{formatEventDate(ev.start)}</p>
        {spansDays && <p className="text-ink-muted mt-0.5">to {formatEventDate(ev.end)}</p>}
      </div>

      {ev.reason && (
        <div>
          <p className="label mb-1">Reason</p>
          <p className="text-sm text-ink-muted">{ev.reason}</p>
        </div>
      )}

      <Link href={`/hr/employees/${ev.employeeId}`} className="btn-secondary self-start">
        <ExternalLink size={15} /> View employee
      </Link>
    </div>
  );
}

type ModalState =
  | { mode: "event"; event: NormEvent }
  | { mode: "day"; date: Date; events: NormEvent[] }
  | null;

export default function AttendanceCalendar({ events }: { events: LeaveEvent[] }) {
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
          <button type="button" onClick={goPrevMonth} aria-label="Previous month" className="btn-secondary px-2.5">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={goNextMonth} aria-label="Next month" className="btn-secondary px-2.5">
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
          No approved leave on file yet — once a leave request is approved (see an employee&apos;s
          page, or their self-service link), it&apos;ll show up here.
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
                  {modal.mode === "event" ? "On leave" : formatEventDate(modal.date)}
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
                <LeaveDetail ev={modal.event} />
              ) : (
                <div className="flex flex-col divide-y divide-line">
                  {modal.events.map((ev) => {
                    const color = colorFor(ev.employeeId);
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => setModal({ mode: "event", event: ev })}
                        className="flex items-center gap-3 py-2.5 text-left hover:bg-paper -mx-1 px-1 rounded-lg transition-colors"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color.bg }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{ev.employeeName}</p>
                          <p className="text-xs text-ink-muted truncate">{ev.employeeTitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
