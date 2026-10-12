import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { employeeFieldsFrom, VALID_EMPLOYEE_STATUSES } from "@/lib/employees";
import { logActivity } from "@/lib/activity";
import { requireAdminApi } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Both handlers here return/accept every Employee field including HKID,
// bank details, and salary — admin-only. (The staff-facing employees list
// page doesn't call this route at all; it queries Prisma directly with a
// narrowed `select`.)
export async function GET(request: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const q = request.nextUrl.searchParams.get("q") || undefined;
  const status = request.nextUrl.searchParams.get("status") || undefined;

  const employees = await prisma.employee.findMany({
    where: {
      status: status && VALID_EMPLOYEE_STATUSES.includes(status) ? status : undefined,
      OR: q
        ? [{ name: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }]
        : undefined,
    },
    // Only the count of pending requests is needed for the list page's
    // "X pending" badge — fetching full rows here would be wasteful.
    include: { leaveRequests: { where: { status: "PENDING" }, select: { id: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    employees.map((e) => ({ ...e, pendingLeaveCount: e.leaveRequests.length, leaveRequests: undefined }))
  );
}

export async function POST(request: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const fields = employeeFieldsFrom(body);
  if (fields.error) {
    return NextResponse.json({ error: fields.error }, { status: 400 });
  }

  const { error, ...data } = fields;
  const employee = await prisma.employee.create({ data });

  await logActivity({
    documentType: "employee",
    documentId: employee.id,
    type: "CREATED",
    description: `Employee record for ${employee.name} created`,
  });

  return NextResponse.json(employee, { status: 201 });
}
