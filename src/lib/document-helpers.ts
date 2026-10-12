import { lineAmount } from "@/lib/calculations";
import { serializeMultipliers, normalizeMultipliers, MultiplierFactor } from "@/lib/multipliers";
import { serializeFees, normalizeFees, Fee } from "@/lib/fees";

// The full set of statuses a row is ever allowed to have — including ones
// the system sets automatically (CONVERTED) that StatusUpdater deliberately
// doesn't offer as a manual choice. Used to reject garbage `status` values
// from a raw API call rather than silently writing them (an invoice/
// quotation with an unrecognized status breaks every filter, badge, and
// the overdue calculation, which only special-cases known strings).
export const VALID_QUOTATION_STATUSES = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "CHANGES_REQUESTED",
  "REJECTED",
  "CONVERTED",
];
export const VALID_INVOICE_STATUSES = [
  "DRAFT",
  "UNPAID",
  "PENDING_VERIFICATION",
  "PAID",
  "CANCELLED",
];

/**
 * Prisma stores each item's `multipliers` and `fees` as JSON strings. Before
 * sending a fetched/created/updated quotation or invoice back to the client,
 * convert both back into live arrays on every item.
 *
 * Deliberately maps with the plain `normalize*` functions rather than
 * chaining `withParsedMultipliersList`/`withParsedFeesList` here: `doc.items`
 * is typed as `any[]` (from the `T extends { items: any[] }` constraint
 * above), so a chained generic call would infer its own type parameter as
 * `any` and then fail the next call's `{ fees: string }` constraint check —
 * a TS quirk with stacking two generic calls on an `any`-typed value, not a
 * Prisma type issue. Mapping directly sidesteps it.
 */
export function withParsedItems<T extends { items: any[] }>(
  doc: T
): Omit<T, "items"> & { items: (Record<string, any> & { multipliers: MultiplierFactor[]; fees: Fee[] })[] } {
  return {
    ...doc,
    items: doc.items.map((item) => ({
      ...item,
      multipliers: normalizeMultipliers(item.multipliers),
      fees: normalizeFees(item.fees),
    })),
  };
}

/** Extract and normalize the embedded customer fields from a request body. */
export function customerFieldsFrom(body: any) {
  return {
    customerName: (body.customerName || "").trim(),
    customerContact: body.customerContact?.trim() || null,
    customerEmail: body.customerEmail?.trim() || null,
    customerPhone: body.customerPhone?.trim() || null,
    customerAddress: body.customerAddress?.trim() || null,
  };
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return TIME_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * Extract and validate an invoice's event date/time fields from a request
 * body. Entirely optional — unlike this field's previous home on Quotation,
 * an invoice's event date is filled in manually sometime after the invoice
 * already exists (see the Invoice model comment in schema.prisma), so
 * there's no "required" piece here at all; either date can be missing or
 * both can be set. `error` is only set for a genuinely invalid combination
 * (an end date earlier than the start date), and the caller should reject
 * the request with a 400 before writing anything in that case. Start/end
 * times are optional free-form "HH:mm" strings; a malformed one is just
 * dropped rather than blocking the whole save.
 */
export function eventFieldsFrom(body: any): {
  eventStartDate: Date | null;
  eventStartTime: string | null;
  eventEndDate: Date | null;
  eventEndTime: string | null;
  error: string | null;
} {
  const parsedStartDate = body.eventStartDate ? new Date(body.eventStartDate) : null;
  const startDate = parsedStartDate && !Number.isNaN(parsedStartDate.getTime()) ? parsedStartDate : null;
  const parsedEndDate = body.eventEndDate ? new Date(body.eventEndDate) : null;
  const endDate = parsedEndDate && !Number.isNaN(parsedEndDate.getTime()) ? parsedEndDate : null;
  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    return {
      eventStartDate: null,
      eventStartTime: null,
      eventEndDate: null,
      eventEndTime: null,
      error: "Event end date must be on or after the start date.",
    };
  }
  return {
    eventStartDate: startDate,
    eventStartTime: normalizeTime(body.eventStartTime),
    eventEndDate: endDate,
    eventEndTime: normalizeTime(body.eventEndTime),
    error: null,
  };
}

/** Normalize a request-body line item into Prisma create data. */
export function itemCreateFrom(item: any, index: number) {
  return {
    name: item.name.trim(),
    description: (item.description || "").trim(),
    imageData: item.imageData || null,
    unit: (item.unit || "").trim(),
    quantity: Number(item.quantity) || 0,
    multipliers: serializeMultipliers(item.multipliers),
    unitPrice: Number(item.unitPrice) || 0,
    amount: lineAmount(item),
    duration: (item.duration || "").trim() || null,
    fees: serializeFees(item.fees),
    sortOrder: index,
  };
}

import {
  DEFAULT_PAYMENT_DUE_DAYS,
  DEFAULT_TERMS_TEMPLATES,
  DEFAULT_REMINDER_TEMPLATES,
  VALID_DOCUMENT_LANGUAGES,
  type DocumentLanguage,
  renderTerms,
} from "@/lib/settings";

/** Validate an arbitrary request-body value against the known document
 *  languages, defaulting to "EN" for anything unrecognized/missing — same
 *  defensive normalization every other enum-like field in this app gets. */
export function documentLanguageFrom(value: unknown): DocumentLanguage {
  return VALID_DOCUMENT_LANGUAGES.includes(value as DocumentLanguage)
    ? (value as DocumentLanguage)
    : "EN";
}

/**
 * Normalize the shared document fields (terms, reminder, payment window,
 * language) from a request body, applying the standardized defaults when the
 * client omits them.
 *
 * - `paymentDueDays` always resolves to a finite number (default 30).
 * - `language` always resolves to a known DocumentLanguage (default "EN").
 * - `terms` falls back to the standardized template (in the resolved
 *   language) with the payment window substituted in, so every new document
 *   carries consistent wording.
 * - `reminder` falls back to the standardized reminder template (in the
 *   resolved language).
 */
/**
 * An invoice's due date is never entered directly — it's always the issue
 * date plus its payment window, so the two can never silently drift apart
 * (e.g. someone editing payment terms without remembering to also bump the
 * due date by hand). Callers should compute this fresh any time either
 * `issueDate` or `paymentDueDays` changes, rather than trust a stored
 * `dueDate` that predates one of them changing.
 */
export function computeDueDate(issueDate: Date, paymentDueDays: number): Date {
  return new Date(issueDate.getTime() + paymentDueDays * 24 * 60 * 60 * 1000);
}

export function documentDefaultsFrom(body: any) {
  const raw = Number(body.paymentDueDays);
  const paymentDueDays =
    Number.isFinite(raw) && raw >= 0 ? Math.round(raw) : DEFAULT_PAYMENT_DUE_DAYS;

  const language = documentLanguageFrom(body.language);

  const terms =
    typeof body.terms === "string" && body.terms.trim()
      ? body.terms
      : renderTerms(DEFAULT_TERMS_TEMPLATES[language], paymentDueDays);

  const reminder =
    typeof body.reminder === "string" && body.reminder.trim()
      ? body.reminder
      : DEFAULT_REMINDER_TEMPLATES[language];

  return { paymentDueDays, terms, reminder, language };
}
