/**
 * A user-added multiplier factor on a line item, e.g. "× 3 persons". Items
 * carry zero or more of these — the user can add and remove them freely — and
 * the final amount is quantity * unitPrice * the product of every factor's
 * value. Zero factors means no extra scaling (product defaults to 1).
 */
export type MultiplierFactor = {
  value: number;
  label: string;
};

/**
 * Normalize arbitrary input (a live array from client state, a JSON string
 * from the DB, or anything else) into a clean array of valid factors.
 * Invalid or non-finite entries are dropped rather than throwing, so a
 * malformed value never blocks saving a document.
 */
export function normalizeMultipliers(raw: unknown): MultiplierFactor[] {
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
    .map((m) => ({
      value: Number(m?.value),
      label: typeof m?.label === "string" ? m.label.trim() : "",
    }))
    .filter((m) => Number.isFinite(m.value));
}

/** Serialize a list of multiplier factors for storage in the DB's String column. */
export function serializeMultipliers(raw: unknown): string {
  return JSON.stringify(normalizeMultipliers(raw));
}

/** Product of every factor's value; an empty list is a no-op (product 1). */
export function multiplierProduct(raw: unknown): number {
  const list = normalizeMultipliers(raw);
  if (list.length === 0) return 1;
  return list.reduce((product, m) => product * m.value, 1);
}

/** Convert one DB row's `multipliers` JSON string into a live array for API responses / the UI. */
export function withParsedMultipliers<T extends { multipliers: string }>(
  item: T
): Omit<T, "multipliers"> & { multipliers: MultiplierFactor[] } {
  return { ...item, multipliers: normalizeMultipliers(item.multipliers) };
}

/** Same as withParsedMultipliers, applied to a whole list of rows. */
export function withParsedMultipliersList<T extends { multipliers: string }>(
  items: T[]
): (Omit<T, "multipliers"> & { multipliers: MultiplierFactor[] })[] {
  return items.map(withParsedMultipliers);
}

/** Human-readable suffix for display, e.g. " × 3 persons × 2 sessions". Empty string if none. */
export function formatMultipliers(raw: unknown): string {
  const list = normalizeMultipliers(raw);
  if (list.length === 0) return "";
  return list.map((m) => ` × ${m.value}${m.label ? ` ${m.label}` : ""}`).join("");
}
