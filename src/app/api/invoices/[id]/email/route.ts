import { NextRequest, NextResponse } from "next/server";
import { buildInvoicePdf } from "@/lib/pdf/build";
import { sendDocumentEmail } from "@/lib/mailer";
import { isValidEmail } from "@/lib/settings";
import { ensureInvoiceViewToken, invoiceViewUrlFor } from "@/lib/signing";
import { extraAttachmentsFrom } from "@/lib/emailAttachments";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));

  const built = await buildInvoicePdf(params.id);
  if (!built) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const to = (body.to || built.customerEmail || "").trim();
  if (!isValidEmail(to)) {
    return NextResponse.json(
      { error: "The customer's email address is missing or invalid." },
      { status: 400 }
    );
  }
  if (!body.subject?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "Email subject and body are required." }, { status: 400 });
  }

  // A one-off CC list for this send only — case by case, on top of any
  // standing CC configured in Settings (merged in sendDocumentEmail).
  const ccList = (Array.isArray(body.cc) ? body.cc : body.cc ? [body.cc] : [])
    .map((e: unknown) => (typeof e === "string" ? e.trim() : ""))
    .filter(Boolean);
  if (ccList.some((e: string) => !isValidEmail(e))) {
    return NextResponse.json({ error: "One of the CC email addresses is invalid." }, { status: 400 });
  }

  // Every invoice email carries a secure, tokenized "View & Pay Invoice
  // Online" link, same as the automatic email sent right after a quotation
  // is signed.
  const token = await ensureInvoiceViewToken(params.id);
  const signingUrl = token ? invoiceViewUrlFor(token, request) : undefined;

  let extraAttachments;
  try {
    extraAttachments = extraAttachmentsFrom(body.attachments);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    await sendDocumentEmail({
      to,
      cc: ccList,
      subject: body.subject.trim(),
      body: body.body,
      attachment: { filename: `${built.number}.pdf`, content: built.buffer },
      extraAttachments,
      signingUrl,
      ctaLabel: "View & Pay Invoice Online",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to send the email." },
      { status: 502 }
    );
  }

  await logActivity({
    documentType: "invoice",
    documentId: params.id,
    type: "EMAIL_SENT",
    description: body.isFollowUp ? `Follow-up reminder emailed to ${to}` : `Emailed to ${to}`,
  });

  return NextResponse.json({ success: true, to, signingUrl });
}
