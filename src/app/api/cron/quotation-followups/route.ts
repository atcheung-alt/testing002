import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildQuotationPdf } from "@/lib/pdf/build";
import { sendDocumentEmail } from "@/lib/mailer";
import { isValidEmail } from "@/lib/settings";
import { ensureSigningToken, signingUrlFor } from "@/lib/signing";
import { logActivity } from "@/lib/activity";
import { COMPANY } from "@/lib/company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FOLLOW_UP_AFTER_DAYS = 7;

/**
 * Daily cron (see vercel.json) — emails a gentle reminder to clients whose
 * quotation has been sent (not draft, not yet signed) for at least
 * FOLLOW_UP_AFTER_DAYS, and who haven't already received one. Sent at most
 * once per quotation ever (followUpSentAt is set the moment one goes out);
 * re-sending the quotation manually resets that, giving it a fresh window.
 *
 * "Sent" is measured from the most recent EMAIL_SENT activity-log entry for
 * that quotation, since that's the actual moment the client received it —
 * falling back to the quotation's createdAt if it was marked Sent by hand
 * without ever emailing it.
 *
 * Auth: Vercel invokes this with `Authorization: Bearer <CRON_SECRET>`
 * automatically once CRON_SECRET is set as an env var — see .env.example.
 * This route is excluded from the normal staff-login gate in middleware.ts
 * (it isn't a browser request from a logged-in user) and relies on this
 * secret instead.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const candidates = await prisma.quotation.findMany({
    where: {
      status: "SENT",
      signedAt: null,
      followUpSentAt: null,
      customerEmail: { not: null },
    },
    select: { id: true, number: true, title: true, customerName: true, customerEmail: true, createdAt: true },
  });

  const cutoff = Date.now() - FOLLOW_UP_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const results: { number: string; sent: boolean; reason?: string }[] = [];

  for (const q of candidates) {
    if (!isValidEmail(q.customerEmail)) {
      results.push({ number: q.number, sent: false, reason: "invalid email" });
      continue;
    }

    const lastEmail = await prisma.activityEvent.findFirst({
      where: { documentType: "quotation", documentId: q.id, type: "EMAIL_SENT" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const referenceTime = (lastEmail?.createdAt || q.createdAt).getTime();
    if (referenceTime > cutoff) {
      results.push({ number: q.number, sent: false, reason: "not due yet" });
      continue;
    }

    try {
      const built = await buildQuotationPdf(q.id);
      if (!built) {
        results.push({ number: q.number, sent: false, reason: "PDF build failed" });
        continue;
      }

      const token = await ensureSigningToken(q.id);
      const signingUrl = token ? signingUrlFor(token, request) : undefined;
      const subject = `Reminder: Quotation ${q.number}${q.title ? ` — ${q.title}` : ""} is awaiting your review`;
      const body = `Dear ${q.customerName || "Customer"},

This is a friendly reminder that quotation ${q.number}${q.title ? ` for ${q.title}` : ""} is still awaiting your review and signature.

${signingUrl ? `To review and accept it online, please use the "Review & Sign Online" link below — no login required.` : "Please get in touch if you have any questions."}

Best regards,
${COMPANY.name}`;

      await sendDocumentEmail({
        to: q.customerEmail as string,
        subject,
        body,
        attachment: { filename: `${q.number}.pdf`, content: built.buffer },
        signingUrl,
      });

      await prisma.quotation.update({
        where: { id: q.id },
        data: { followUpSentAt: new Date() },
      });

      await logActivity({
        documentType: "quotation",
        documentId: q.id,
        type: "EMAIL_SENT",
        actor: "SYSTEM",
        description: `Follow-up reminder emailed to ${q.customerEmail} (not yet signed after ${FOLLOW_UP_AFTER_DAYS} days)`,
      });

      results.push({ number: q.number, sent: true });
    } catch (err: any) {
      results.push({ number: q.number, sent: false, reason: err?.message || "send failed" });
    }
  }

  return NextResponse.json({
    checked: candidates.length,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
