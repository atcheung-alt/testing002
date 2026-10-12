/**
 * Turn `from`/`to` (YYYY-MM-DD strings from a date input) into a Prisma
 * date filter against a date column, inclusive on both ends. `to` is
 * bumped to the start of the next day so the entire "to" day is included
 * (a plain `lte` on a date-only string would otherwise cut off at
 * midnight, excluding everything from that day itself).
 */
export function dateRangeFilter(
  from: string | undefined,
  to: string | undefined
): { gte?: Date; lt?: Date } | undefined {
  if (!from && !to) return undefined;

  const filter: { gte?: Date; lt?: Date } = {};
  if (from) {
    const start = new Date(`${from}T00:00:00`);
    if (!Number.isNaN(start.getTime())) filter.gte = start;
  }
  if (to) {
    const end = new Date(`${to}T00:00:00`);
    if (!Number.isNaN(end.getTime())) {
      end.setDate(end.getDate() + 1);
      filter.lt = end;
    }
  }
  return Object.keys(filter).length ? filter : undefined;
}
