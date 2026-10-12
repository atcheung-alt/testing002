import { prisma } from "@/lib/prisma";
import { computeLeaveBalance, hasAnnualLeaveEntitlement, requestDuration } from "@/lib/employees";

export type MyLeaveRequestView = {
  id: string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDayPeriod: string | null;
  days: number;
  reason: string;
  status: string;
  decidedNote: string | null;
  createdAt: string;
};

export type MyProfileLeaveView = {
  employeeId: string;
  name: string;
  title: string;
  startDate: string | null;
  status: string;
  // Despite the field name (kept as-is to avoid touching every consumer),
  // this is the *accrued-so-far* entitlement, not the flat annual figure —
  // see computeAccruedEntitlement in src/lib/employees.ts.
  annualLeaveDays: number;
  leaveUsed: number;
  leaveRemaining: number;
  // Same idea as PublicEmployeeLeaveView.canRequestLeave — hide the request
  // form once the employee has left, keep the balance/history visible.
  // Onboarding employees can still request leave (they're current staff,
  // just mid-paperwork) — only FORMER blocks it.
  canRequestLeave: boolean;
  leaveRequests: MyLeaveRequestView[];
  // Intern/Part time/Freelance have no annual leave entitlement at all (see
  // hasAnnualLeaveEntitlement in src/lib/employees.ts) — MyLeaveClient uses
  // this to hide the entitlement/request-leave section entirely for them,
  // rather than just showing a permanent 0/0/0 balance.
  hasLeaveEntitlement: boolean;
};

/**
 * Find the Employee record linked to a logged-in User, by matching their
 * session email against Employee.companyEmail (case-insensitive — company
 * email addresses aren't case sensitive in practice, and we don't want a
 * capitalization mismatch to silently break the link). Returns null if no
 * employee has this company email on file yet — the /hr/profile page shows
 * a "not linked, contact HR" message in that case rather than erroring.
 */
export async function findEmployeeByCompanyEmail(email: string) {
  if (!email) return null;
  return prisma.employee.findFirst({
    where: { companyEmail: { equals: email, mode: "insensitive" } },
  });
}

/**
 * Authenticated, self-service equivalent of getPublicEmployeeLeaveView —
 * same shape/logic, but scoped by the caller's own session email (via
 * companyEmail) instead of a shareable leaveToken. Used by /hr/profile and
 * its leave-request API route.
 */
export async function getMyProfileLeaveView(email: string): Promise<MyProfileLeaveView | null> {
  const employee = await prisma.employee.findFirst({
    where: { companyEmail: { equals: email, mode: "insensitive" } },
    include: { leaveRequests: { orderBy: { createdAt: "desc" } } },
  });
  if (!employee) return null;

  const { entitlement, used, remaining } = computeLeaveBalance(
    employee.annualLeaveDays,
    employee.startDate,
    employee.leaveRequests
  );

  return {
    employeeId: employee.id,
    name: employee.name,
    title: employee.title,
    startDate: employee.startDate ? employee.startDate.toISOString() : null,
    status: employee.status,
    annualLeaveDays: entitlement,
    leaveUsed: used,
    leaveRemaining: remaining,
    canRequestLeave: employee.status !== "FORMER",
    hasLeaveEntitlement: hasAnnualLeaveEntitlement(employee.employmentType),
    leaveRequests: employee.leaveRequests.map((r) => ({
      id: r.id,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      isHalfDay: r.isHalfDay,
      halfDayPeriod: r.halfDayPeriod,
      days: requestDuration(r),
      reason: r.reason,
      status: r.status,
      decidedNote: r.decidedNote,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
