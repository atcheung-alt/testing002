import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { syncPayrollRunToDrive } from "@/lib/driveSync";

export const dynamic = "force-dynamic";

/**
 * Manually push every entry's current payslip PDF to Drive — replaces the
 * old "syncs automatically when you finalize" behavior now that runs stay
 * editable indefinitely (see PayrollRunEntries.tsx). Safe to click more than
 * once; each sync just re-uploads over the same Drive file per entry.
 */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const run = await prisma.payrollRun.findUnique({ where: { id: params.id } });
  if (!run) {
    return NextResponse.json({ error: "Payroll run not found." }, { status: 404 });
  }

  const driveWarning = await syncPayrollRunToDrive(params.id);

  await logActivity({
    documentType: "payroll",
    documentId: run.id,
    type: "EDITED",
    description: `Payroll run for ${run.period} synced to Google Drive`,
  });

  return NextResponse.json({ success: true, driveWarning });
}
