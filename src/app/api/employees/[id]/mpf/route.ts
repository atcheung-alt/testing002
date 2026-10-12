import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireAdminApi } from "@/lib/auth";

// One-way "mark MPF enrollment verified" action — mirrors the contract
// verify endpoint's shape (a dedicated PATCH separate from the generic
// employee-edit route, since this isn't part of the normal edit form).
// There's no un-verify: if staff mark this by mistake, editing the record
// directly is the escape hatch, same as contract verification has none.
export async function PATCH(_request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const employee = await prisma.employee.findUnique({ where: { id: params.id } });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }
  if (employee.mpfVerifiedAt) {
    return NextResponse.json({ error: "MPF enrollment is already marked as verified." }, { status: 409 });
  }

  const updated = await prisma.employee.update({
    where: { id: params.id },
    data: { mpfVerifiedAt: new Date() },
  });

  await logActivity({
    documentType: "employee",
    documentId: updated.id,
    type: "EDITED",
    description: `MPF enrollment verified for ${updated.name}`,
  });

  return NextResponse.json(updated);
}
