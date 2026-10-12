import { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = "brand",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: "brand" | "accent" | "ink" | "danger";
}) {
  const accentClasses =
    accent === "accent"
      ? "bg-accent-100 text-accent-600"
      : accent === "ink"
      ? "bg-paper text-ink-muted"
      : accent === "danger"
      ? "bg-danger-50 text-danger-500"
      : "bg-brand-50 text-brand-500";

  return (
    <div className="card p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
          {label}
        </p>
        <p className="font-mono text-2xl font-semibold text-ink">{value}</p>
      </div>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentClasses}`}>
        <Icon size={18} />
      </div>
    </div>
  );
}
