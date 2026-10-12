import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Clock, FileText, FileDown, ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/calculations";
import { ensureLeaveToken, leaveUrlFromHeaders, ensureEmployeeContractSigningToken, employeeContractSigningUrlFromHeaders } from "@/lib/signing";
import {
  computeLeaveBalance,
  EMPLOYEE_STAFF_SELECT,
  EMPLOYMENT_TYPE_LABELS,
  PAY_RATE_TYPE_LABELS,
  getContractPrerequisiteIssues,
  getManualOnboardingCompletionIssues,
  hasAnnualLeaveEntitlement,
} from "@/lib/employees";
import { isValidEmail } from "@/lib/settings";
import { getActivityTimeline } from "@/lib/activity";
import { mpfReminderFor } from "@/lib/payroll";
import { getCurrentUser, requireAdminPage } from "@/lib/auth";
import DeleteButton from "@/components/DeleteButton";
import CopySigningLinkButton from "@/components/CopySigningLinkButton";
import DownloadPdfButton from "@/components/DownloadPdfButton";
import SendEmailButton from "@/components/SendEmailButton";
import VerifyContractButton from "@/components/VerifyContractButton";
import ActivityTimeline from "@/components/ActivityTimeline";
import LeaveRequestActions from "@/components/LeaveRequestActions";
import SendOnboardingButton from "@/components/SendOnboardingButton";
import MarkOnboardingCompleteButton from "@/components/MarkOnboardingCompleteButton";
import MpfVerifyButton from "@/components/MpfVerifyButton";
import SalaryReportButton from "@/components/SalaryReportButton";
import IR56BButton from "@/components/IR56BButton";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink text-right">{value || "—"}</span>
    </div>
  );
}

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  // Admin-only, like the rest of /hr/employees — non-admins are redirected
  // to /hr/profile (see requireAdminPage). The isAdmin-narrowed
  // EMPLOYEE_STAFF_SELECT branch below is dead code past this guard, but
  // left in place rather than ripped out — a cheap safety net if this page
  // is ever reopened to non-admins again.
  await requireAdminPage();
  const user = await getCurrentUser();
  const isAdmin = !!user?.isAdmin;

  // Two different Prisma queries, not one query with fields hidden in the
  // JSX: a non-admin's request never selects HKID/address/birthday/salary/
  // bank columns in the first place, so that data never enters server
  // memory for this request at all rather than merely being un-rendered.
  const employee = isAdmin
    ? await prisma.employee.findUnique({
        where: { id: params.id },
        include: { leaveRequests: { orderBy: { createdAt: "desc" } }, contract: true },
      })
    : ((await prisma.employee.findUnique({
        where: { id: params.id },
        select: { ...EMPLOYEE_STAFF_SELECT, leaveRequests: { orderBy: { createdAt: "desc" } } },
      })) as any); // deliberately narrower shape for non-admins — see EMPLOYEE_STAFF_SELECT
  if (!employee) notFound();

  const token = await ensureLeaveToken(employee.id);
  const leaveUrl = token ? leaveUrlFromHeaders(token) : null;
  const { entitlement, used, remaining } = computeLeaveBalance(
    employee.annualLeaveDays,
    employee.startDate,
    employee.leaveRequests
  );
  const timeline = await getActivityTimeline("employee", employee.id);

  const contract = isAdmin ? (employee as any).contract : null;
  let contractSigningUrl: string | null = null;
  if (isAdmin && contract && (contract.status === "SENT" || contract.status === "DRAFT")) {
    const contractToken = await ensureEmployeeContractSigningToken(contract.id);
    contractSigningUrl = contractToken ? employeeContractSigningUrlFromHeaders(contractToken) : null;
  }
  const contractEmail = employee.personalEmail || employee.email || "";
  // Only relevant for an employee who was added directly and never sent an
  // invite link — see MarkOnboardingCompleteButton/the onboarding/complete
  // route for why this is scoped that way.
  const manualCompletionIssues =
    isAdmin && !employee.onboardingSentAt && !employee.onboardingCompletedAt
      ? getManualOnboardingCompletionIssues(employee)
      : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-2xl font-semibold text-ink">{employee.name}</h1>
            <span
              className={`stamp ${
                employee.status === "ACTIVE"
                  ? "border-brand-500 text-brand-500 bg-brand-50"
                  : employee.status === "ONBOARDING"
                  ? "border-cyan-500 text-cyan-600 bg-cyan-50"
                  : "border-ink-faint text-ink-faint"
              }`}
            >
              {employee.status}
            </span>
          </div>
          {employee.title && <p className="text-sm text-ink-muted">{employee.title}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {leaveUrl && (
            <CopySigningLinkButton
              url={leaveUrl}
              label="Copy leave link"
              title="Copy this employee's personal leave link"
            />
          )}
          {isAdmin && (
            <>
              <SalaryReportButton employeeId={employee.id} />
              <IR56BButton employeeId={employee.id} hkid={employee.hkid} address={employee.address} />
              <Link href={`/hr/employees/${employee.id}/edit`} className="btn-secondary">
                <Pencil size={15} /> Edit
              </Link>
              <DeleteButton
                url={`/api/employees/${employee.id}`}
                confirmNumber={employee.name}
                itemLabel="employee record"
                redirectTo="/hr/employees"
              />
            </>
          )}
        </div>
      </div>

      {/* Once onboarding is complete (whichever way it got there), this card
          has nothing left to prompt — hide it rather than leave a permanent
          "Onboarding complete" banner taking up space. */}
      {isAdmin && !employee.onboardingCompletedAt && (
        <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-cyan-100 text-cyan-600">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">
                {employee.onboardingSentAt
                  ? `Onboarding invite sent — ${formatDate(employee.onboardingSentAt)}`
                  : "Onboarding not sent yet"}
              </p>
              <p className="text-xs text-ink-muted">
                {employee.email ? `Contact email: ${employee.email}` : "No contact email on file yet."}
              </p>
              {/* Only shown for a manually-added employee (never invited) —
                  tells the admin what's still missing before they can mark
                  onboarding complete without going through the invite link. */}
              {!employee.onboardingSentAt && manualCompletionIssues.length > 0 && (
                <p className="text-xs text-ink-faint mt-1 max-w-sm">
                  Or fill in the following to mark onboarding complete manually:{" "}
                  {manualCompletionIssues.join(", ")}.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <SendOnboardingButton employeeId={employee.id} resend={!!employee.onboardingSentAt} />
            {!employee.onboardingSentAt && manualCompletionIssues.length === 0 && (
              <MarkOnboardingCompleteButton employeeId={employee.id} />
            )}
          </div>
        </div>
      )}

      {/* Only Full time employees get an MPF enrollment deadline reminder —
          see mpfReminderFor in src/lib/payroll.ts for why. */}
      {isAdmin && employee.employmentType === "FULL_TIME" && (() => {
        const reminder = mpfReminderFor(employee.employmentType, employee.startDate, employee.mpfVerifiedAt);
        return (
          <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  employee.mpfVerifiedAt
                    ? "bg-emerald-50 text-emerald-600"
                    : reminder?.severity === "overdue"
                    ? "bg-danger-50 text-danger-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                {employee.mpfVerifiedAt ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
              </div>
              <div>
                <p className="text-sm font-medium text-ink">
                  {employee.mpfVerifiedAt
                    ? `MPF enrollment verified — ${formatDate(employee.mpfVerifiedAt)}`
                    : reminder
                    ? `MPF enrollment needed — deadline ${formatDate(reminder.deadline)}`
                    : "MPF enrollment not yet verified"}
                </p>
                <p className="text-xs text-ink-muted">
                  {employee.mpfVerifiedAt
                    ? "Confirmed enrolled with an MPF trustee."
                    : employee.startDate
                    ? "Enrollment window is 60 days from the start date above."
                    : "No start date on file yet — add one to track the deadline."}
                </p>
              </div>
            </div>
            {!employee.mpfVerifiedAt && <MpfVerifyButton employeeId={employee.id} />}
          </div>
        );
      })()}

      {/* Only Full time employees accrue annual leave — see
          hasAnnualLeaveEntitlement in src/lib/employees.ts, the same rule
          EmployeeForm.tsx uses to hide the field on the edit page. Interns/
          Part time/Freelance never accrue any, so these four boxes would
          just show a permanent 0/0/0/0 for them — hidden entirely instead. */}
      {hasAnnualLeaveEntitlement(employee.employmentType) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
              Annual entitlement
            </p>
            <p className="font-mono text-xl font-semibold text-ink">{employee.annualLeaveDays} days</p>
            <p className="text-xs text-ink-faint mt-0.5">Full amount per year</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
              Accrued to date
            </p>
            <p className="font-mono text-xl font-semibold text-ink">{entitlement} days</p>
            <p className="text-xs text-ink-faint mt-0.5">
              {employee.startDate ? "Based on time worked" : "No start date on file — using full amount"}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Applied</p>
            <p className="font-mono text-xl font-semibold text-ink">{used} days</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Remaining</p>
            <p
              className={`font-mono text-xl font-semibold ${remaining < 0 ? "text-danger-500" : "text-brand-600"}`}
            >
              {remaining} days
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Non-sensitive — visible to every signed-in staff account. */}
        <div className="card p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Employment</h2>
          <div className="flex flex-col gap-2 text-sm">
            <Row label="Gender" value={employee.gender} />
            <Row label="Employment type" value={EMPLOYMENT_TYPE_LABELS[employee.employmentType || ""] || null} />
            <Row label="Company email" value={employee.companyEmail} />
            <Row label="Start date" value={formatDate(employee.startDate)} />
            {employee.employmentType !== "FREELANCE" && (
              <>
                <Row label="Work location" value={contract?.workLocation} />
                <Row label="Working hours" value={contract?.workSchedule} />
              </>
            )}
            {employee.status === "FORMER" && <Row label="Last day" value={formatDate(employee.lastDay)} />}
            {isAdmin && employee.payRateType ? (
              <Row
                label={PAY_RATE_TYPE_LABELS[employee.payRateType] || "Pay rate"}
                value={
                  formatCurrency(employee.payRate) +
                  (employee.payRateType === "HOURLY" ? " /hour" : employee.payRateType === "DAILY" ? " /day" : "")
                }
              />
            ) : (
              isAdmin && <Row label="Salary" value={formatCurrency(employee.salary)} />
            )}
            {isAdmin && employee.status === "FORMER" && (
              <Row label="Reason of leaving" value={employee.leavingReason} />
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold">Contract</h2>
              {contract && (
                <span
                  className={`stamp ${
                    contract.status === "VERIFIED"
                      ? "border-brand-500 text-brand-500 bg-brand-50"
                      : contract.status === "SIGNED"
                      ? "border-amber-500 text-amber-600 bg-amber-50"
                      : "border-ink-faint text-ink-faint"
                  }`}
                >
                  {contract.status}
                </span>
              )}
            </div>

            {!contract && (() => {
              const issues = getContractPrerequisiteIssues(employee);
              return issues.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-ink-muted">
                    Fill in the following before a contract can be created:
                  </p>
                  <ul className="text-sm text-amber-600 list-disc pl-5">
                    {issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                  {issues.some((i) => i !== "Employee hasn't completed onboarding yet") && (
                    <Link href={`/hr/employees/${employee.id}/edit`} className="btn-secondary self-start">
                      <Pencil size={15} /> Edit employee
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-ink-muted">No contract has been created yet.</p>
                  <Link href={`/hr/employees/${employee.id}/contract`} className="btn-secondary self-start">
                    <FileText size={15} /> Create contract
                  </Link>
                </div>
              );
            })()}

            {contract && contract.status === "DRAFT" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-muted">Draft — not yet sent to {employee.name}.</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/hr/employees/${employee.id}/contract`} className="btn-secondary">
                    <Pencil size={15} /> Edit
                  </Link>
                  <DownloadPdfButton url={`/api/employees/${employee.id}/contract/pdf`} />
                  <SendEmailButton
                    kind="employees"
                    id={employee.id}
                    endpoint={`/api/employees/${employee.id}/contract/email`}
                    defaultTo={contractEmail}
                    defaultSubject="Your employment contract"
                    defaultBody={`Hi ${employee.name},\n\nPlease review and sign your employment contract using the button below.`}
                    emailValid={isValidEmail(contractEmail)}
                  />
                </div>
              </div>
            )}

            {contract && contract.status === "SENT" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-muted">Sent — waiting for {employee.name} to sign.</p>
                <div className="flex flex-wrap gap-2">
                  <DownloadPdfButton url={`/api/employees/${employee.id}/contract/pdf`} />
                  {contractSigningUrl && (
                    <CopySigningLinkButton
                      url={contractSigningUrl}
                      label="Copy signing link"
                      title="Copy the public review & sign link"
                    />
                  )}
                  <SendEmailButton
                    kind="employees"
                    id={employee.id}
                    endpoint={`/api/employees/${employee.id}/contract/email`}
                    defaultTo={contractEmail}
                    defaultSubject="Your employment contract"
                    defaultBody={`Hi ${employee.name},\n\nJust a reminder to review and sign your employment contract using the button below.`}
                    emailValid={isValidEmail(contractEmail)}
                  />
                </div>
              </div>
            )}

            {contract && contract.status === "SIGNED" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-muted">
                  Signed by {contract.signerName || employee.name}
                  {contract.signedAt ? ` on ${formatDateTime(contract.signedAt)}` : ""} — please review before
                  verifying.
                </p>
                {contract.signedDocumentData ? (
                  <a
                    href={`/api/employees/${employee.id}/contract/signed-document`}
                    className="btn-secondary self-start"
                  >
                    <FileDown size={15} />
                    Download {contract.signedDocumentName || "signed document"}
                  </a>
                ) : (
                  contract.signatureData && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={contract.signatureData}
                      alt="Signature"
                      className="max-h-20 bg-white rounded-lg border border-line"
                    />
                  )
                )}
                {contract.signedDocumentData && (
                  <p className="text-xs text-ink-faint">Uploaded a scanned/printed document</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <DownloadPdfButton url={`/api/employees/${employee.id}/contract/pdf`} />
                  <VerifyContractButton employeeId={employee.id} />
                </div>
              </div>
            )}

            {contract && contract.status === "VERIFIED" && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-ink-muted">
                  Verified{contract.verifiedAt ? ` on ${formatDateTime(contract.verifiedAt)}` : ""} — employee is
                  Active.
                </p>
                <div className="flex flex-wrap gap-2">
                  <DownloadPdfButton url={`/api/employees/${employee.id}/contract/pdf`} />
                  {contract.driveFileUrl && (
                    <a
                      href={contract.driveFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                    >
                      <ExternalLink size={15} /> Contract on Drive
                    </a>
                  )}
                </div>
              </div>
            )}

            {contract && (
              <div className="mt-4 pt-4 border-t border-line">
                <DeleteButton
                  url={`/api/employees/${employee.id}/contract`}
                  confirmNumber={employee.name}
                  itemLabel="contract"
                  redirectTo={`/hr/employees/${employee.id}/contract`}
                  label="Delete & regenerate"
                  extraWarning={
                    contract.status === "DRAFT"
                      ? undefined
                      : `This permanently deletes the ${contract.status.toLowerCase()} contract${
                          contract.status === "SIGNED" || contract.status === "VERIFIED"
                            ? ", including the signature on file,"
                            : ""
                        } so you can create a new one from scratch.`
                  }
                />
              </div>
            )}
          </div>
        )}

        <div className="card p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Leave requests</h2>
          <LeaveRequestActions
            employeeId={employee.id}
            requests={employee.leaveRequests.map((r: any) => ({
              id: r.id,
              employeeId: employee.id,
              startDate: r.startDate.toISOString(),
              endDate: r.endDate.toISOString(),
              isHalfDay: r.isHalfDay,
              halfDayPeriod: r.halfDayPeriod,
              reason: r.reason,
              status: r.status as "PENDING" | "APPROVED" | "REJECTED",
              decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
              decidedNote: r.decidedNote,
              createdAt: r.createdAt.toISOString(),
              updatedAt: r.updatedAt.toISOString(),
            }))}
          />
        </div>

        {/* Admin-only — HKID, birthday, address, and bank details never
            reach this point in the JSX (let alone the client) unless
            isAdmin is true; for a non-admin request the underlying Prisma
            query above never even fetched these columns. */}
        {isAdmin && (
          <div className="card p-5">
            <h2 className="font-display text-lg font-semibold mb-3">Personal</h2>
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Chinese name" value={employee.nameChinese} />
              <Row label="HKID" value={employee.hkid} />
              <Row label="Birthday" value={formatDate(employee.birthday)} />
              <Row label="Nationality" value={employee.nationality} />
              <Row label="Phone" value={employee.phone} />
              <Row label="Personal email" value={employee.personalEmail} />
              <Row label="Address" value={employee.address} />
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="card p-5">
            <h2 className="font-display text-lg font-semibold mb-3">Emergency contact</h2>
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Name" value={employee.emergencyContactName} />
              <Row label="Relationship" value={employee.emergencyContactRelationship} />
              <Row label="Contact number" value={employee.emergencyContactPhone} />
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="card p-5">
            <h2 className="font-display text-lg font-semibold mb-3">Bank details</h2>
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Bank" value={employee.bankName} />
              <Row label="Bank code" value={employee.bankCode} />
              <Row label="Account number" value={employee.bankAccount} />
              <Row label="Account holder" value={employee.bankCardName} />
            </div>
          </div>
        )}
      </div>

      <ActivityTimeline events={timeline} />
    </div>
  );
}
