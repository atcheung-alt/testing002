import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { isValidEmail, staffReplyEmailContent } from "@/lib/settings";
import { sendDocumentEmail } from "@/lib/mailer";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

/** Staff reply on a quotation's feedback thread — emails the client too. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));

  const quotation = await prisma.quotation.findUnique({ where: { id: params.id } });
  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Please enter a reply message." }, { status: 400 });
  }

  const authorName =
    typeof body.authorName === "string" && body.authorName.trim()
      ? body.authorName.trim()
      : COMPANY.contact?.name || COMPANY.shortName || COMPANY.name;

  const comment = await prisma.quotationComment.create({
    data: {
      quotationId: quotation.id,
      author: "STAFF",
      authorName,
      message,
    },
  });

  await logActivity({
    documentType: "quotation",
    documentId: quotation.id,
    type: "COMMENT_ADDED",
    actor: "STAFF",
    description: `Staff replied: ${message.slice(0, 80)}${message.length > 80 ? "…" : ""}`,
  });

  let emailWarning: string | null = null;
  if (isValidEmail(quotation.customerEmail)) {
    try {
      const { subject, body: emailBody } = staffReplyEmailContent({
        number: quotation.number,
        title: quotation.title,
        customerName: quotation.customerName,
        companyName: COMPANY.shortName || COMPANY.name,
        message,
      });
      await sendDocumentEmail({
        to: quotation.customerEmail as string,
        subject,
        body: emailBody,
      });
    } catch (err: any) {
      emailWarning = err?.message || "Reply was saved, but the email to the client could not be sent.";
    }
  } else {
    emailWarning = "Reply was saved, but the client has no valid email on file to notify.";
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
    emailWarning,
  });
}
