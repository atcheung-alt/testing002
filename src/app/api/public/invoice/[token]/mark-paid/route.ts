import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { isValidEmail, paymentSubmittedNotificationEmailContent } from "@/lib/settings";
import { sendDocumentEmail } from "@/lib/mailer";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

/**
 * Public, token-scoped endpoint for a client to declare an invoice paid.
 * Flips the invoice to PENDING_VERIFICATION and notifies HR Plus — it does
 * NOT mark the invoice PAID itself; only HR verifying the payment (from the
 * invoice page) does that, which is what generates the receipt.
 */
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const body = await request.json().catch(() => ({}));

  const invoice = await prisma.invoice.findUnique({ where: { viewToken: params.token } });
  if (!invoice) {
    return NextResponse.json(
      { error: "This invoice link is invalid or has expired." },
      { status: 404 }
    );
  }

  // Prevent duplicate submissions.
  if (invoice.status === "PENDING_VERIFICATION") {
    return NextResponse.json(
      { error: "This invoice has already been marked as paid and is awaiting verification." },
      { status: 409 }
    );
  }
  if (invoice.status === "PAID") {
    return NextResponse.json({ error: "This invoice has already been paid." }, { status: 409 });
  }
  if (invoice.status === "CANCELLED") {
    return NextResponse.json({ error: "This invoice has been cancelled." }, { status: 409 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "PENDING_VERIFICATION",
      paymentSubmittedAt: new Date(),
      paymentSubmittedName: name,
      paymentSubmittedEmail: email,
    },
  });

  await logActivity({
    documentType: "invoice",
    documentId: updated.id,
    type: "PAYMENT_MARKED",
    actor: "CLIENT",
    actorName: name,
    description: `${name} marked this invoice as paid — awaiting verification`,
  });

  let emailWarning: string | null = null;
  try {
    const { subject, body: emailBody } = paymentSubmittedNotificationEmailContent({
      number: updated.number,
      title: updated.title,
      customerName: updated.customerName,
      submitterName: name,
      submitterEmail: email,
      total: updated.total,
      currency: COMPANY.currency || "HKD",
    });
    await sendDocumentEmail({
      to: COMPANY.email || COMPANY.contact?.email || "",
      subject,
      body: emailBody,
    });
  } catch (err: any) {
    emailWarning =
      err?.message || "Your submission was saved, but the notification email could not be sent.";
  }

  return NextResponse.json({
    success: true,
    status: updated.status,
    emailWarning,
  });
}
