import clsx from "clsx";

const STYLES: Record<string, string> = {
  DRAFT: "border-ink-faint text-ink-muted",
  SENT: "border-brand-500 text-brand-500",
  ACCEPTED: "border-brand-500 text-brand-500 bg-brand-50",
  REJECTED: "border-danger-500 text-danger-500",
  CHANGES_REQUESTED: "border-accent-500 text-accent-600 bg-accent-100",
  CONVERTED: "border-accent-500 text-accent-600",
  UNPAID: "border-accent-500 text-accent-600",
  PENDING_VERIFICATION: "border-brand-500 text-brand-500 bg-brand-50",
  PAID: "border-brand-500 text-brand-500 bg-brand-50",
  OVERDUE: "border-danger-500 text-danger-500",
  CANCELLED: "border-ink-faint text-ink-faint",
  FINALIZED: "border-brand-500 text-brand-500 bg-brand-50",
};

const LABELS: Record<string, string> = {
  CHANGES_REQUESTED: "CHANGES REQUESTED",
  PENDING_VERIFICATION: "PENDING VERIFICATION",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("stamp", STYLES[status] || "border-ink-faint text-ink-muted")}>
      {LABELS[status] || status}
    </span>
  );
}
