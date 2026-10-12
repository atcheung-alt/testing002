import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { nextDocumentNumber } from "@/lib/numbering";
import { buildReceiptPdf } from "@/lib/pdf/build";
import { isValidEmail, receiptEmailContent } from "@/lib/settings";
import { sendDocumentEmail } from "@/lib/mailer";
import { syncInvoiceRecordToDrive } from "@/lib/driveSync";
import { logActivity } from "@/lib/activity";

/**
 * Ensure a receipt exists for a now-paid invoice, generating one (and
 * emailing the client a copy) if it doesn't. Idempotent — safe to call every
 * time an invoice transitions to PAID, including if that happens more than
 * once for any reason.
 */
export async function ensureReceiptForInvoice(
  invoiceId: string
): Promise<{ receiptNumber: string; emailWarning: string | null; driveWarning: string | null }> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { receipt: true },
  });
  if (!invoice) throw new Error("Invoice not found.");

  if (invoice.receipt) {
    return { receiptNumber: invoice.receipt.number, emailWarning: null, driveWarning: null };
  }

  const number = await nextDocumentNumber("receipt");
  await prisma.receipt.create({
    data: { number, invoiceId: invoice.id },
  });

  await logActivity({
    documentType: "invoice",
    documentId: invoice.id,
    type: "RECEIPT_GENERATED",
    actor: "SYSTEM",
    description: `Receipt ${number} generated`,
  });

  let emailWarning: string | null = null;
  try {
    const built = await buildReceiptPdf(invoice.id);
    if (built && isValidEmail(invoice.customerEmail)) {
      const { subject, body } = receiptEmailContent({
        receiptNumber: number,
        invoiceNumber: invoice.number,
        title: invoice.title,
        customerName: invoice.customerName,
        companyName: COMPANY.shortName || COMPANY.name,
      });
      await sendDocumentEmail({
        to: invoice.customerEmail as string,
        subject,
        body,
        attachment: { filename: `${number}.pdf`, content: built.buffer },
      });
      await logActivity({
        documentType: "invoice",
        documentId: invoice.id,
        type: "EMAIL_SENT",
        actor: "SYSTEM",
        description: `Receipt ${number} emailed to ${invoice.customerEmail}`,
      });
    } else if (!isValidEmail(invoice.customerEmail)) {
      emailWarning = "Receipt was generated, but the client has no valid email on file to notify.";
    }
  } catch (err: any) {
    emailWarning = err?.message || "Receipt was generated, but the email to the client could not be sent.";
  }

  // Push the latest quotation/invoice/receipt PDFs for this client/project
  // into their shared Google Drive folder. A no-op if Drive isn't
  // configured; any failure here is reported back but never blocks the
  // receipt itself, which has already been created and emailed above.
  const driveWarning = await syncInvoiceRecordToDrive(invoice.id);

  return { receiptNumber: number, emailWarning, driveWarning };
}
