import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { employeeFieldsFrom } from "@/lib/employees";
import { logActivity } from "@/lib/activity";
import { requireAdminApi } from "@/lib/auth";

// Every handler in this file reads/writes full Employee rows — HKID, bank
// details, salary included — so all of them are admin-only. The staff
// detail/edit views for a single employee don't call this GET at all; the
// detail page queries Prisma directly (narrowed for non-admins), and only
// an admin ever reaches the edit page that would PATCH here.
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { leaveRequests: { orderBy: { createdAt: "desc" } } },
  });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }
  return NextResponse.json(employee);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const existing = await prisma.employee.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const fields = employeeFieldsFrom(body);
  if (fields.error) {
    return NextResponse.json({ error: fields.error }, { status: 400 });
  }

  const { error, ...data } = fields;
  const employee = await prisma.employee.update({ where: { id: params.id }, data });

  await logActivity({
    documentType: "employee",
    documentId: employee.id,
    type: "EDITED",
    description: `Employee record for ${employee.name} updated`,
  });

  return NextResponse.json(employee);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const existing = await prisma.employee.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  await logActivity({
    documentType: "employee",
    documentId: existing.id,
    type: "DELETED",
    description: `Employee record for ${existing.name} deleted`,
  });

  // Cascades to every LeaveRequest belonging to this employee (see
  // onDelete: Cascade on LeaveRequest.employee in schema.prisma).
  await prisma.employee.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
