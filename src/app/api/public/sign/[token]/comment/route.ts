import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { isValidEmail, clientFeedbackNotificationEmailContent } from "@/lib/settings";
import { sendDocumentEmail } from "@/lib/mailer";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

/**
 * Public, token-scoped endpoint for a client to leave feedback or demand
 * changes on a quotation instead of accepting it outright. Creates a
 * QuotationComment, flips the quotation to CHANGES_REQUESTED (unless it's
 * already been signed/converted), and notifies HR Plus by email.
 */
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const body = await request.json().catch(() => ({}));

  const quotation = await prisma.quotation.findUnique({ where: { signingToken: params.token } });
  if (!quotation) {
    return NextResponse.json(
      { error: "This signing link is invalid or has expired." },
      { status: 404 }
    );
  }
  if (quotation.status === "CONVERTED") {
    return NextResponse.json(
      { error: "This quotation is locked and no longer accepts feedback." },
      { status: 409 }
    );
  }
  if (quotation.signedAt) {
    return NextResponse.json(
      { error: "This quotation has already been signed and accepted." },
      { status: 409 }
    );
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "Please enter your feedback or requested changes." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.quotationComment.create({
      data: {
        quotationId: quotation.id,
        author: "CLIENT",
        authorName: name,
        message,
      },
    });
    await tx.quotation.update({
      where: { id: quotation.id },
      data: { status: "CHANGES_REQUESTED" },
    });
    return created;
  });

  await logActivity({
    documentType: "quotation",
    documentId: quotation.id,
    type: "COMMENT_ADDED",
    actor: "CLIENT",
    actorName: name,
    description: `${name} requested changes`,
  });

  let emailWarning: string | null = null;
  try {
    const { subject, body: emailBody } = clientFeedbackNotificationEmailContent({
      number: quotation.number,
      title: quotation.title,
      customerName: quotation.customerName,
      commenterName: name,
      message,
    });
    await sendDocumentEmail({
      to: COMPANY.email || COMPANY.contact?.email || "",
      subject,
      body: emailBody,
    });
  } catch (err: any) {
    emailWarning = err?.message || "Feedback was saved, but the notification email could not be sent.";
  }

  return NextResponse.json({
    success: true,
    comment: {
      id: comment.id,
      author: comment.author,
      authorName: comment.authorName,
      message: comment.message,
      createdAt: comment.createdAt,
    },
    status: "CHANGES_REQUESTED",
    emailWarning,
  });
}
