import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildRecruitmentAgreementPdf } from "@/lib/pdf/build";
import { pdfContentDisposition, pdfDownloadLanguage } from "@/lib/pdf/language";

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const language = pdfDownloadLanguage(request.nextUrl.searchParams.get("lang"));
  const agreement = await prisma.recruitmentAgreement.findUnique({
    where: { signingToken: params.token },
    select: { id: true },
  });
  if (!agreement) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 404 });
  }

  const built = await buildRecruitmentAgreementPdf(agreement.id, language);
  if (!built) {
    return NextResponse.json({ error: "Recruitment agreement not found." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(built.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": pdfContentDisposition(`${built.number}.pdf`, language),
    },
  });
}
