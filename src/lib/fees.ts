/**
 * A user-added named extra charge on a line item, e.g. "Transportation fee".
 * Items carry zero or more of these — the user can add and remove them
 * freely — and each one's amount adds directly on top of the item's base
 * amount (quantity * unitPrice * multipliers) when computing the document
 * subtotal. See lineTotal/lineTotalWithFee in src/lib/calculations.ts.
 */
export type Fee = {
  label: string;
  amount: number;
};

/**
 * Normalize arbitrary input (a live array from client state, a JSON string
 * from the DB, or anything else) into a clean array of valid fees. Invalid
 * or non-finite entries are dropped rather than throwing, so a malformed
 * value never blocks saving a document.
 */
export function normalizeFees(raw: unknown): Fee[] {
  let arr: any[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      arr = [];
    }
  }
  return arr
    .map((f) => ({
      label: typeof f?.label === "string" ? f.label.trim() : "",
      amount: Math.max(0, Number(f?.amount) || 0),
    }))
    .filter((f) => Number.isFinite(f.amount));
}

/** Serialize a list of fees for storage in the DB's String column. */
export function serializeFees(raw: unknown): string {
  return JSON.stringify(normalizeFees(raw));
}

/** Sum of every fee's amount; an empty list totals 0. */
export function feesTotal(raw: unknown): number {
  return normalizeFees(raw).reduce((sum, f) => sum + f.amount, 0);
}

/** Convert one DB row's `fees` JSON string into a live array for API responses / the UI. */
export function withParsedFees<T extends { fees: string }>(
  item: T
): Omit<T, "fees"> & { fees: Fee[] } {
  return { ...item, fees: normalizeFees(item.fees) };
}

/** Same as withParsedFees, applied to a whole list of rows. */
export function withParsedFeesList<T extends { fees: string }>(
  items: T[]
): (Omit<T, "fees"> & { fees: Fee[] })[] {
  return items.map(withParsedFees);
}
