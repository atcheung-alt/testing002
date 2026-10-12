import { parseDataUrl } from "@/lib/mailer";

// -----------------------------------------------------------------------------
// Lets staff attach their own files (a signed PO, a supporting doc, etc.) to
// an individual outgoing email from SendEmailButton.tsx — on top of the
// document's own PDF, which every /email route already attaches via
// `attachment`. Shared by every /email route (invoices, quotations,
// recruitment, employee contracts, payslips) rather than duplicated five
// times. Reuses sendDocumentEmail's existing `extraAttachments` option in
// src/lib/mailer.ts, which already supported this shape but had no caller
// until now.
// -----------------------------------------------------------------------------

export const MAX_EMAIL_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8MB per file
export const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024; // combined, leaving headroom under most SMTP providers' ~25MB message cap once the primary PDF + inline logo are added

export type EmailAttachmentInput = { filename?: unknown; data?: unknown };

/**
 * Turn the client-supplied `attachments` array (each a `{ filename, data:
 * "data:<mime>;base64,..." }` pair from SendEmailButton's file picker) into
 * the shape `sendDocumentEmail`'s `extraAttachments` expects. Malformed
 * entries (not the expected shape, or not a real data URL) are silently
 * dropped rather than failing the whole send — the client already validates
 * before it ever gets here, so this is defense in depth, not the primary
 * check. Size/count limits ARE enforced here (the one thing worth rejecting
 * a request over) by throwing a plain Error with a user-facing message;
 * callers should catch it and respond with a 400.
 */
export function extraAttachmentsFrom(
  raw: unknown
): { filename: string; content: Buffer; contentType?: string }[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (raw.length > MAX_EMAIL_ATTACHMENTS) {
    throw new Error(`You can attach up to ${MAX_EMAIL_ATTACHMENTS} files.`);
  }

  let totalBytes = 0;
  const result: { filename: string; content: Buffer; contentType?: string }[] = [];
  for (const item of raw as EmailAttachmentInput[]) {
    if (!item || typeof item.data !== "string") continue;
    const parsed = parseDataUrl(item.data);
    if (!parsed) continue;

    const filename = (typeof item.filename === "string" ? item.filename.trim() : "") || "attachment";
    if (parsed.buffer.length > MAX_ATTACHMENT_BYTES) {
      throw new Error(`"${filename}" is larger than ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB.`);
    }
    totalBytes += parsed.buffer.length;
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      throw new Error(`Your attachments add up to more than ${MAX_TOTAL_ATTACHMENT_BYTES / (1024 * 1024)}MB combined.`);
    }

    result.push({ filename, content: parsed.buffer, contentType: parsed.contentType });
  }
  return result;
}
