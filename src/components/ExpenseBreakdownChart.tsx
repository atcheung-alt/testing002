import { formatCurrency } from "@/lib/calculations";

type ExpenseCategoryBreakdown = {
  category: string;
  amount: number;
  pctOfRevenue: number | null;
};

// Cycled through in order — same family of colors already used across the
// Analysis page's other chart (MonthlyFinanceChart) plus a few extras for
// when there are more than three expense categories.
const PALETTE = [
  "#4F7CFF", // brand-500
  "#C4483A", // danger-500
  "#9B6BEA", // accent-500
  "#2FAE7A", // emerald
  "#E0A233", // amber
  "#3AA8C1", // teal
  "#D46FB0", // pink
  "#7C8798", // slate
];

/** One SVG arc path for a pie slice, `startAngle`/`endAngle` in radians, 0 = top, clockwise. */
function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const x1 = cx + r * Math.sin(startAngle);
  const y1 = cy - r * Math.cos(startAngle);
  const x2 = cx + r * Math.sin(endAngle);
  const y2 = cy - r * Math.cos(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

export default function ExpenseBreakdownChart({
  categories,
}: {
  categories: ExpenseCategoryBreakdown[];
}) {
  const total = categories.reduce((sum, c) => sum + c.amount, 0);

  if (categories.length === 0 || total <= 0) {
    return <p className="text-sm text-ink-muted">No expenses logged for this period.</p>;
  }

  const size = 200;
  const r = 90;
  const cx = size / 2;
  const cy = size / 2;

  let angle = 0;
  const slices = categories.map((c, i) => {
    const startAngle = angle;
    const sweep = (c.amount / total) * Math.PI * 2;
    angle += sweep;
    return {
      ...c,
      color: PALETTE[i % PALETTE.length],
      path: sweep >= Math.PI * 2 - 0.0001
        ? null // a single category covering 100% draws as a full circle, not an arc path
        : arcPath(cx, cy, r, startAngle, angle),
      pctOfTotal: (c.amount / total) * 100,
    };
  });

  const largest = categories[0];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-40 h-40 shrink-0" role="img">
        {slices.map((s, i) =>
          s.path ? (
            <path key={i} d={s.path} fill={s.color} />
          ) : (
            <circle key={i} cx={cx} cy={cy} r={r} fill={s.color} />
          )
        )}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="#FFFFFF" />
      </svg>

      <div className="flex flex-col gap-2 w-full">
        <p className="text-xs text-ink-muted">
          Largest: <span className="font-medium text-ink">{largest.category}</span> at{" "}
          {formatCurrency(largest.amount)}
          {largest.pctOfRevenue !== null && ` (${largest.pctOfRevenue.toFixed(1)}% of revenue)`}
        </p>
        <div className="flex flex-col gap-1.5">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-ink-muted flex-1 min-w-0 truncate">{s.category}</span>
              <span className="font-mono text-xs text-ink-faint shrink-0">{s.pctOfTotal.toFixed(1)}%</span>
              <span className="font-mono shrink-0 w-24 text-right">{formatCurrency(s.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
