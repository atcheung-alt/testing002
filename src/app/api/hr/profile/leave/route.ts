import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leaveRequestFieldsFrom } from "@/lib/employees";
import { findEmployeeByCompanyEmail, getMyProfileLeaveView } from "@/lib/myProfile";
import { getCurrentUser } from "@/lib/auth";
import { getClientIp } from "@/lib/signing";
import { logActivity } from "@/lib/activity";
import { formatDate } from "@/lib/calculations";

export const runtime = "nodejs";

/**
 * Submit a new leave request from the authenticated /hr/profile tab —
 * the self-service counterpart to /api/public/leave/[token]/request, but
 * scoped to whichever Employee record the caller's own session email links
 * to (see findEmployeeByCompanyEmail) rather than a shareable token.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const employee = await findEmployeeByCompanyEmail(user.email);
  if (!employee) {
    return NextResponse.json(
      { error: "Your account isn't linked to an employee record yet. Please contact HR." },
      { status: 404 }
    );
  }
  // Onboarding employees can still request leave — they're current staff,
  // just mid-paperwork; only a FORMER (departed) employee is blocked. Keep
  // this in sync with canRequestLeave in src/lib/myProfile.ts.
  if (employee.status === "FORMER") {
    return NextResponse.json(
      { error: "Leave requests can no longer be submitted for this record." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const fields = leaveRequestFieldsFrom(body);
  if (fields.error) {
    return NextResponse.json({ error: fields.error }, { status: 400 });
  }

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      employeeId: employee.id,
      startDate: fields.startDate!,
      endDate: fields.endDate!,
      isHalfDay: fields.isHalfDay,
      halfDayPeriod: fields.halfDayPeriod,
      reason: fields.reason,
      submittedIp: getClientIp(request),
    },
  });

  await logActivity({
    documentType: "employee",
    documentId: employee.id,
    type: "CREATED",
    description: fields.isHalfDay
      ? `Requested ${fields.halfDayPeriod} half-day leave ${formatDate(leaveRequest.startDate)}`
      : `Requested leave ${formatDate(leaveRequest.startDate)} – ${formatDate(leaveRequest.endDate)}`,
  });

  const view = await getMyProfileLeaveView(user.email);
  return NextResponse.json(view, { status: 201 });
}
