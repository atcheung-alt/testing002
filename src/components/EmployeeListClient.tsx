"use client";

import { memo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import Portal from "@/components/Portal";
import { formatDate, formatCurrency } from "@/lib/calculations";
import { EMPLOYMENT_TYPE_LABELS, PAY_RATE_TYPE_LABELS, hasAnnualLeaveEntitlement } from "@/lib/employees";

// Every field the row-click preview panel below wants to show, pre-serialized
// (dates as ISO strings) and pre-computed (mpfReminder, contractActionLabel)
// server-side in src/app/hr/employees/page.tsx — see that file for why.
export type EmployeeListItem = {
  id: string;
  name: string;
  preferredName: string | null;
  nameChinese: string | null;
  title: string;
  status: string;
  employmentType: string | null;
  payRateType: string | null;
  payRate: number;
  salary: number;
  annualLeaveDays: number;
  startDate: string | null;
  lastDay: string | null;
  leavingReason: string | null;
  hkid: string | null;
  address: string | null;
  gender: string | null;
  birthday: string | null;
  nationality: string | null;
  phone: string | null;
  companyEmail: string | null;
  email: string | null;
  personalEmail: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankCardName: string | null;
  bankCode: string | null;
  onboardingSentAt: string | null;
  onboardingCompletedAt: string | null;
  mpfVerifiedAt: string | null;
  pendingLeaveCount: number;
  contractStatus: string | null;
  contractActionLabel: string | null;
  mpfReminder: { severity: "upcoming" | "overdue"; label: string } | null;
};

/** "Full name (Preferred name) Chinese name" — only the parts that exist. */
function displayName(e: EmployeeListItem): string {
  let out = e.name;
  if (e.preferredName) out += ` (${e.preferredName})`;
  if (e.nameChinese) out += ` ${e.nameChinese}`;
  return out;
}

function statusStampClass(status: string): string {
  if (status === "ACTIVE") return "border-brand-500 text-brand-500 bg-brand-50";
  if (status === "ONBOARDING") return "border-cyan-500 text-cyan-600 bg-cyan-50";
  return "border-ink-faint text-ink-faint";
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink text-right">{value || "—"}</span>
    </div>
  );
}

// Split out and memoized so that opening/closing the preview panel — which
// only changes `selectedId` in the parent below — doesn't force React to
// re-run this map over every employee on every click. Without this, clicking
// a row re-renders the entire table (all rows, all badge conditionals) just
// to open a panel that only cares about the ONE selected employee; that
// re-render cost grows with headcount, which is exactly why it got
// noticeably slower to open a preview as more employees were added.
const EmployeeTable = memo(function EmployeeTable({
  employees,
  onSelect,
}: {
  employees: EmployeeListItem[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <th className="px-5 py-3">Name</th>
            <th className="hidden md:table-cell px-5 py-3">Title</th>
            <th className="px-5 py-3">Status</th>
            <th className="hidden sm:table-cell px-5 py-3">Onboard date</th>
            <th className="px-5 py-3 text-right" aria-label="Notifications" />
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr
              key={e.id}
              onClick={() => onSelect(e.id)}
              className="cursor-pointer border-b border-line last:border-0 hover:bg-brand-50/40"
            >
              <td className="px-5 py-3">
                <span className="font-medium text-brand-600 block">{displayName(e)}</span>
                {e.employmentType && (
                  <span className="text-xs text-ink-muted block mt-0.5">
                    {EMPLOYMENT_TYPE_LABELS[e.employmentType] || e.employmentType}
                  </span>
                )}
              </td>
              <td className="hidden md:table-cell px-5 py-3 text-ink-muted">
                {e.title || "No title set"}
              </td>
              <td className="px-5 py-3">
                <span className={`stamp justify-center ${statusStampClass(e.status)}`}>{e.status}</span>
              </td>
              <td className="hidden sm:table-cell px-5 py-3 text-ink-muted">
                {e.startDate ? formatDate(e.startDate) : "—"}
              </td>

              {/* Notifications, pushed to the rightmost edge of the row —
                  leave-pending / contract / onboarding / MPF badges only;
                  employment type now shows as its own line under the name
                  instead. */}
              <td className="px-5 py-3">
                <span className="flex items-center gap-2 flex-wrap justify-end">
                  {e.pendingLeaveCount > 0 && (
                    <span className="stamp border-accent-500 text-accent-600 bg-accent-100">
                      {e.pendingLeaveCount} pending
                    </span>
                  )}
                  {e.contractActionLabel && (
                    <span className="stamp border-amber-500 text-amber-600 bg-amber-50">
                      {e.contractActionLabel}
                    </span>
                  )}
                  {e.onboardingSentAt && !e.onboardingCompletedAt && (
                    <span className="stamp border-cyan-500 text-cyan-600 bg-cyan-100">
                      Onboarding pending
                    </span>
                  )}
                  {e.mpfReminder && (
                    <span
                      className={`stamp ${
                        e.mpfReminder.severity === "overdue"
                          ? "border-danger-500 text-danger-600 bg-danger-50"
                          : "border-amber-500 text-amber-600 bg-amber-50"
                      }`}
                    >
                      {e.mpfReminder.label}
                    </span>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default function EmployeeListClient({ employees }: { employees: EmployeeListItem[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = employees.find((e) => e.id === selectedId) || null;

  return (
    <>
      {/* `setSelectedId` is a useState setter, so its identity is stable
          across renders — passing it straight through here keeps
          EmployeeTable's memoization intact. */}
      <EmployeeTable employees={employees} onSelect={setSelectedId} />

      {selected && (
        <Portal>
          {/* No backdrop — this floats on top of the page without blocking
              it, so the employee list underneath stays fully scrollable and
              clickable while the preview is open. Inset from all three free
              edges (top/right/bottom) rather than flush against them, so it
              genuinely reads as a floating card, and rounded on every
              corner since it's no longer docked flush to the viewport edge. */}
          <aside className="fixed top-4 right-4 bottom-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-surface rounded-2xl shadow-2xl border border-line flex flex-col overflow-hidden animate-slide-in-right">
            <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-line shrink-0">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close preview"
                title="Close"
                className="shrink-0 p-1.5 -m-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-paper transition-colors"
              >
                <X size={18} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold text-ink truncate">{displayName(selected)}</p>
                <p className="text-sm text-ink-muted truncate mt-0.5">{selected.title || "No title set"}</p>
                <div className="flex items-center gap-2 flex-wrap mt-2.5">
                  <span className={`stamp ${statusStampClass(selected.status)}`}>{selected.status}</span>
                  {selected.employmentType && (
                    <span className="stamp border-line text-ink-muted">
                      {EMPLOYMENT_TYPE_LABELS[selected.employmentType] || selected.employmentType}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/hr/employees/${selected.id}`)}
                aria-label="Open full employee page"
                title="Open full employee page"
                className="shrink-0 p-1.5 -m-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-paper transition-colors"
              >
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-2 text-sm divide-y divide-line">
              <div className="py-4 flex flex-col gap-2.5 first:pt-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Contact</h3>
                <Row label="Company email" value={selected.companyEmail} />
                <Row label="Contact email" value={selected.email} />
                <Row label="Personal email" value={selected.personalEmail} />
                <Row label="Phone" value={selected.phone} />
              </div>

              <div className="py-4 flex flex-col gap-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Personal</h3>
                <Row label="Gender" value={selected.gender} />
                <Row label="Date of birth" value={formatDate(selected.birthday)} />
                <Row label="HKID" value={selected.hkid} />
                <Row label="Nationality" value={selected.nationality} />
                <Row label="Address" value={selected.address} />
              </div>

              <div className="py-4 flex flex-col gap-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Employment</h3>
                <Row label="Start date" value={formatDate(selected.startDate)} />
                {selected.status === "FORMER" && (
                  <>
                    <Row label="Last day" value={formatDate(selected.lastDay)} />
                    <Row label="Reason of leaving" value={selected.leavingReason} />
                  </>
                )}
                {selected.payRateType ? (
                  <Row
                    label={PAY_RATE_TYPE_LABELS[selected.payRateType] || "Pay rate"}
                    value={
                      formatCurrency(selected.payRate) +
                      (selected.payRateType === "HOURLY"
                        ? " /hour"
                        : selected.payRateType === "DAILY"
                        ? " /day"
                        : "")
                    }
                  />
                ) : (
                  <Row label="Salary" value={formatCurrency(selected.salary)} />
                )}
                {hasAnnualLeaveEntitlement(selected.employmentType) && (
                  <Row label="Annual leave entitlement" value={`${selected.annualLeaveDays} days`} />
                )}
              </div>

              <div className="py-4 flex flex-col gap-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Bank</h3>
                <Row label="Bank name" value={selected.bankName} />
                <Row label="Bank code" value={selected.bankCode} />
                <Row label="Account holder" value={selected.bankCardName} />
                <Row label="Account number" value={selected.bankAccount} />
              </div>

              <div className="py-4 flex flex-col gap-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Emergency contact
                </h3>
                <Row label="Name" value={selected.emergencyContactName} />
                <Row label="Relationship" value={selected.emergencyContactRelationship} />
                <Row label="Phone" value={selected.emergencyContactPhone} />
              </div>

              <div className="py-4 flex flex-col gap-2.5 last:pb-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Status</h3>
                <Row
                  label="Onboarding"
                  value={
                    selected.onboardingCompletedAt
                      ? `Complete — ${formatDate(selected.onboardingCompletedAt)}`
                      : selected.onboardingSentAt
                      ? `Invite sent — ${formatDate(selected.onboardingSentAt)}`
                      : "Not sent yet"
                  }
                />
                {selected.employmentType === "FULL_TIME" && (
                  <Row
                    label="MPF"
                    value={
                      selected.mpfVerifiedAt
                        ? `Verified — ${formatDate(selected.mpfVerifiedAt)}`
                        : selected.mpfReminder
                        ? selected.mpfReminder.label
                        : "Not yet verified"
                    }
                  />
                )}
                <Row label="Contract" value={selected.contractStatus || "Not created yet"} />
                {selected.pendingLeaveCount > 0 && (
                  <Row label="Pending leave requests" value={String(selected.pendingLeaveCount)} />
                )}
              </div>
            </div>
          </aside>
        </Portal>
      )}
    </>
  );
}
