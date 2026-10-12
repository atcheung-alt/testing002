import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { employeeContractFieldsFrom, trimmedOrNull } from "@/lib/employeeContract";
import { getContractPrerequisiteIssues } from "@/lib/employees";
import { logActivity } from "@/lib/activity";
import { syncEmployeeContractToDrive } from "@/lib/driveSync";

export const dynamic = "force-dynamic";

/**
 * Create or update an employee's contract details (terms, probation period,
 * end date, work location/schedule) — the staff-facing step between
 * "checked the onboarding submission" and "send for signature". One
 * contract per employee, so POST upserts rather than always creating a new
 * row. Fields stay editable only up to SENT (see the PATCH guard below);
 * once signed, the letter is a record of what was actually agreed to.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { contract: true },
  });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }
  if (employee.contract && employee.contract.status !== "DRAFT" && employee.contract.status !== "SENT") {
    return NextResponse.json(
      { error: "This contract has already been signed and can no longer be edited here." },
      { status: 409 }
    );
  }

  // Same prerequisites the employee detail page checks before it even shows
  // a "Create contract" link — enforced here too so a direct API call can't
  // skip past them.
  if (!employee.contract) {
    const issues = getContractPrerequisiteIssues(employee);
    if (issues.length > 0) {
      return NextResponse.json(
        { error: `Fill in the following before a contract can be created: ${issues.join(", ")}.` },
        { status: 409 }
      );
    }
  }

  const body = await request.json().catch(() => ({}));
  const fields = employeeContractFieldsFrom(body);

  const contract = employee.contract
    ? await prisma.employeeContract.update({ where: { id: employee.contract.id }, data: fields })
    : await prisma.employeeContract.create({ data: { employeeId: employee.id, ...fields } });

  await logActivity({
    documentType: "employee",
    documentId: employee.id,
    type: employee.contract ? "EDITED" : "CREATED",
    description: employee.contract
      ? "Contract details updated"
      : "Contract details created",
  });

  return NextResponse.json(contract, { status: employee.contract ? 200 : 201 });
}

/**
 * PATCH handles two distinct actions on the same resource:
 *  - `{ verify: true }` — staff confirms the signed contract. Transitions
 *    SIGNED -> VERIFIED and, in the same step, flips the employee's own
 *    status from ONBOARDING to ACTIVE (the one place that transition
 *    happens — see the onboarding workflow description this feature was
 *    built from).
 *  - anything else — a normal field edit, same validation/guard as POST.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { contract: true },
  });
  if (!employee || !employee.contract) {
    return NextResponse.json({ error: "This employee has no contract yet." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  if (body.verify === true) {
    if (employee.contract.status !== "SIGNED") {
      return NextResponse.json(
        { error: "Only a signed contract can be verified." },
        { status: 409 }
      );
    }
    const updated = await prisma.employeeContract.update({
      where: { id: employee.contract.id },
      data: { status: "VERIFIED", verifiedAt: new Date() },
    });
    if (employee.status === "ONBOARDING") {
      await prisma.employee.update({ where: { id: employee.id }, data: { status: "ACTIVE" } });
    }
    await logActivity({
      documentType: "employee",
      documentId: employee.id,
      type: "CONTRACT_VERIFIED",
      description: `Contract verified — ${employee.name} marked as Active`,
    });
    const driveWarning = await syncEmployeeContractToDrive(employee.id);
    return NextResponse.json({ ...updated, driveWarning });
  }

  // A quick, narrow update from the employee edit page (see EmployeeForm) —
  // touches only the two work-details columns, leaving `terms` and every
  // other contract field untouched. Only allowed while still a DRAFT: once
  // sent/signed, the letter itself is the record of what was agreed to, and
  // this shortcut deliberately doesn't rewrite it (use the full contract
  // edit page instead, which regenerates the letter text to match).
  if (body.updateWorkDetails === true) {
    if (employee.contract.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Work location and working hours can only be edited here while the contract is still a draft." },
        { status: 409 }
      );
    }
    const updated = await prisma.employeeContract.update({
      where: { id: employee.contract.id },
      data: {
        workLocation: trimmedOrNull(body.workLocation),
        workSchedule: trimmedOrNull(body.workSchedule),
      },
    });
    return NextResponse.json(updated);
  }

  if (employee.contract.status !== "DRAFT" && employee.contract.status !== "SENT") {
    return NextResponse.json(
      { error: "This contract has already been signed and can no longer be edited here." },
      { status: 409 }
    );
  }

  const fields = employeeContractFieldsFrom(body);
  const updated = await prisma.employeeContract.update({
    where: { id: employee.contract.id },
    data: fields,
  });

  await logActivity({
    documentType: "employee",
    documentId: employee.id,
    type: "EDITED",
    description: "Contract details updated",
  });

  return NextResponse.json(updated);
}

/**
 * Delete this employee's contract outright — including any signature and
 * sent/signed/verified history — so staff can start a fresh one from
 * scratch (e.g. the job title or salary was wrong and the letter had
 * already been sent or signed). `employeeId` is unique on EmployeeContract,
 * so once this row is gone the "Create contract" flow is available again
 * immediately. Deliberately does not touch Employee.status — an already
 * VERIFIED/ACTIVE employee stays ACTIVE even if their contract record is
 * wiped and redone, since that's a paperwork fix, not an actual change to
 * their employment.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { contract: true },
  });
  if (!employee || !employee.contract) {
    return NextResponse.json({ error: "This employee has no contract to delete." }, { status: 404 });
  }

  await prisma.employeeContract.delete({ where: { id: employee.contract.id } });

  await logActivity({
    documentType: "employee",
    documentId: employee.id,
    type: "DELETED",
    description: "Contract deleted — ready to create a new one",
  });

  return NextResponse.json({ success: true });
}
