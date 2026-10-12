import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const run = await prisma.payrollRun.findUnique({
    where: { id: params.id },
    include: { entries: { orderBy: { employeeName: "asc" } } },
  });
  if (!run) {
    return NextResponse.json({ error: "Payroll run not found." }, { status: 404 });
  }
  return NextResponse.json(run);
}

// There used to be a "finalize" PATCH here that locked every entry against
// further edits. That's been removed — payroll runs stay editable
// indefinitely now (see PayrollRunEntries.tsx). Uploading payslips to Drive
// no longer piggybacks on finalizing either; see the dedicated
// /api/payroll/[id]/drive-sync route for that, triggered manually instead.

/** A payroll run can always be deleted now — there's no "finalized, historical
 *  record" state protecting it anymore. */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const run = await prisma.payrollRun.findUnique({ where: { id: params.id } });
  if (!run) {
    return NextResponse.json({ error: "Payroll run not found." }, { status: 404 });
  }

  await prisma.payrollRun.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
