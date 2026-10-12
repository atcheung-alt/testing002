import clsx from "clsx";

// Shared between the public /leave/[token] history list and the staff
// Employee detail page's leave-requests section, so PENDING/APPROVED/
// REJECTED always read the same way everywhere.
const STYLES: Record<string, string> = {
  PENDING: "border-accent-500 text-accent-600 bg-accent-100",
  APPROVED: "border-brand-500 text-brand-500 bg-brand-50",
  REJECTED: "border-danger-500 text-danger-500",
};

export default function LeaveStatusBadge({ status }: { status: string }) {
  return <span className={clsx("stamp", STYLES[status] || "border-ink-faint text-ink-muted")}>{status}</span>;
}
