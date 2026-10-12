/**
 * "Overdue" is never stored on an invoice — it's derived live from the due
 * date so it always reflects reality without any manual status update.
 *
 * Rules:
 * - A PAID (or CANCELLED, DRAFT, PENDING_VERIFICATION) invoice is never
 *   shown as overdue, regardless of its due date.
 * - An UNPAID invoice becomes "Overdue" the moment the current date passes
 *   its due date, and reverts automatically if the due date is later moved
 *   forward or the invoice is paid.
 */
/**
 * Collapses a legacy literal "OVERDUE" (manually set before this feature
 * existed) back to "UNPAID" — going forward, OVERDUE is only ever a
 * computed display value, never something stored or manually chosen.
 */
export function normalizeInvoiceStatus(status: string): string {
  return status === "OVERDUE" ? "UNPAID" : status;
}

export function getInvoiceDisplayStatus(invoice: {
  status: string;
  dueDate: Date | string | null;
}): string {
  const status = normalizeInvoiceStatus(invoice.status);
  if (status !== "UNPAID" || !invoice.dueDate) {
    return status;
  }
  const due = typeof invoice.dueDate === "string" ? new Date(invoice.dueDate) : invoice.dueDate;
  return Date.now() > due.getTime() ? "OVERDUE" : status;
}

export function isOverdueInvoice(invoice: { status: string; dueDate: Date | string | null }): boolean {
  return getInvoiceDisplayStatus(invoice) === "OVERDUE";
}
