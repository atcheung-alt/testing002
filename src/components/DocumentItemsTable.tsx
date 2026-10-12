import { formatCurrency, lineTotalWithFee } from "@/lib/calculations";
import type { LineItem } from "@/types";

export default function DocumentItemsTable({
  items,
  subtotal,
  discount,
  taxRate,
  taxAmount,
  total,
  repeatCount,
  rawSubtotal,
}: {
  items: LineItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  // Quotation-only: when the whole item list is repeated several times
  // (e.g. a training run 3 times), these two show the "per session ×
  // count" breakdown above the (already-multiplied) Subtotal row. Omitted
  // entirely for Invoices, which have no repeat concept.
  repeatCount?: number;
  rawSubtotal?: number;
}) {
  const showRepeatBreakdown = Boolean(repeatCount && repeatCount > 1 && rawSubtotal !== undefined);
  return (
    <div className="card p-5">
      <div className="hidden sm:grid grid-cols-[1fr_70px_90px_110px_110px] gap-3 px-1 pb-2 border-b border-ink text-xs font-semibold uppercase tracking-wide text-ink-muted">
        <span>Description</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Duration</span>
        <span className="text-right">Unit price</span>
        <span className="text-right">Amount</span>
      </div>
      <div className="divide-y divide-line">
        {items.map((item, i) => (
          <div key={item.id || i} className="py-3">
            <div className="grid grid-cols-2 sm:grid-cols-[1fr_70px_90px_110px_110px] gap-3 text-sm">
              <div className="col-span-2 sm:col-span-1 flex gap-3">
                {item.imageData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageData}
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded-md border border-line shrink-0"
                  />
                ) : null}
                <div className="min-w-0">
                  <div className="font-medium">{item.name || item.description}</div>
                  {item.name && item.description ? (
                    <div className="text-ink-muted text-xs mt-0.5 whitespace-pre-line">
                      {item.description}
                    </div>
                  ) : null}
                </div>
              </div>
              <span className="text-right font-mono text-ink-muted sm:text-ink">
                <span className="sm:hidden text-ink-faint">Qty </span>
                {item.quantity}
                {item.unit ? <span className="text-ink-faint"> {item.unit}</span> : null}
                {(item.multipliers || []).map((m, mi) => (
                  <span key={mi} className="text-ink-faint">
                    {" "}
                    × {m.value}
                    {m.label ? ` ${m.label}` : ""}
                  </span>
                ))}
              </span>
              <span className="text-right font-mono text-ink-muted sm:text-ink">
                {item.duration ? (
                  item.duration
                ) : (
                  <span className="text-ink-faint">—</span>
                )}
              </span>
              <span className="text-right font-mono text-ink-muted sm:text-ink">
                {formatCurrency(item.unitPrice)}
              </span>
              <span className="text-right font-mono font-medium">
                {formatCurrency(lineTotalWithFee(item))}
              </span>
            </div>
            {(item.fees || []).map((fee, fi) => (
              <div key={fi} className="flex items-center justify-between text-xs text-ink-muted mt-1.5 pl-1">
                <span>{fee.label || "Additional fee"}</span>
                <span className="font-mono">{formatCurrency(fee.amount)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <div className="w-full sm:w-72 flex flex-col gap-1.5 text-sm">
          {showRepeatBreakdown ? (
            <>
              <div className="flex justify-between text-ink-muted">
                <span>Subtotal (per session)</span>
                <span className="font-mono text-ink">{formatCurrency(rawSubtotal as number)}</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>× {repeatCount} sessions</span>
              </div>
            </>
          ) : null}
          <div className="flex justify-between text-ink-muted">
            <span>Subtotal</span>
            <span className="font-mono text-ink">{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-ink-muted">
              <span>Discount</span>
              <span className="font-mono text-ink">-{formatCurrency(discount)}</span>
            </div>
          )}
          {taxRate > 0 && (
            <div className="flex justify-between text-ink-muted">
              <span>Tax ({taxRate}%)</span>
              <span className="font-mono text-ink">{formatCurrency(taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 mt-1 border-t border-brand-500/40">
            <span className="font-semibold text-brand-600">Total</span>
            <span className="font-mono font-semibold text-brand-600 text-base">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
