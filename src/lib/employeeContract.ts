// -----------------------------------------------------------------------------
// Shared helpers for the EmployeeContract feature — request body
// normalization for the staff-facing contract details form, mirroring
// employeeFieldsFrom in src/lib/employees.ts.
// -----------------------------------------------------------------------------

export const VALID_EMPLOYEE_CONTRACT_STATUSES = ["DRAFT", "SENT", "SIGNED", "VERIFIED", "CANCELLED"];

export function trimmedOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type EmployeeContractFields = {
  terms: string;
  probationPeriod: string | null;
  contractEndDate: Date | null;
  workLocation: string | null;
  workSchedule: string | null;
};

/**
 * Extract a contract's editable fields from a staff-submitted request body.
 * `terms` may be empty on first creation (the form auto-generates it from
 * the template client-side, same pattern as RecruitmentAgreementForm) — this
 * layer doesn't require it, since a blank draft is still a valid save.
 */
export function employeeContractFieldsFrom(body: any): EmployeeContractFields {
  return {
    terms: typeof body.terms === "string" ? body.terms : "",
    probationPeriod: trimmedOrNull(body.probationPeriod),
    contractEndDate: parseOptionalDate(body.contractEndDate),
    workLocation: trimmedOrNull(body.workLocation),
    workSchedule: trimmedOrNull(body.workSchedule),
  };
}
