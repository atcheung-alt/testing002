import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Staff-facing download of a client's uploaded signed PDF — the alternative
 * to a drawn signature on a recruitment agreement. Mirrors
 * /api/quotations/[id]/signed-document exactly; no extra auth check here
 * beyond the app-wide session requirement already enforced by middleware
 * for every /api/* route (recruitment isn't gated to admins specifically,
 * unlike the HR employee routes).
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const agreement = await prisma.recruitmentAgreement.findUnique({
    where: { id: params.id },
    select: { signedDocumentData: true, signedDocumentName: true, number: true },
  });

  if (!agreement?.signedDocumentData) {
    return NextResponse.json({ error: "No uploaded document for this agreement." }, { status: 404 });
  }

  const base64 = agreement.signedDocumentData.split(",")[1] || "";
  const buffer = Buffer.from(base64, "base64");
  const filename = agreement.signedDocumentName || `${agreement.number}-signed-document.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
    },
  });
}
