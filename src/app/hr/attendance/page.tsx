import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth";
import AttendanceCalendar, { type LeaveEvent } from "@/components/AttendanceCalendar";

export const dynamic = "force-dynamic";

/**
 * Attendance, scoped deliberately narrow: this is a read-only calendar of
 * who's on APPROVED leave and when — not a clock-in/clock-out system, and
 * not a general present/absent/late log. There's no data entry on this page
 * at all; every event here already exists as a LeaveRequest, approved via
 * the normal flow on an employee's page (or their public /leave/{token}
 * self-service link). See AttendanceCalendar.tsx for the month-grid
 * rendering, modeled on the quotation-events /calendar page.
 */
export default async function AttendancePage() {
  await requireAdminPage();

  const requests = await prisma.leaveRequest.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      employeeId: true,
      startDate: true,
      endDate: true,
      reason: true,
      employee: { select: { name: true, title: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const events: LeaveEvent[] = requests.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    employeeName: r.employee.name,
    employeeTitle: r.employee.title,
    reason: r.reason,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">Attendance</h1>
        <p className="text-sm text-ink-muted">
          Every approved leave request, laid out day by day — click a name or a busy day to see
          who&apos;s out.
        </p>
      </div>

      <AttendanceCalendar events={events} />
    </div>
  );
}
