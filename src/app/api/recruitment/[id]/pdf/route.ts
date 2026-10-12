import { NextRequest, NextResponse } from "next/server";
import { buildRecruitmentAgreementPdf } from "@/lib/pdf/build";
import { pdfContentDisposition, pdfDownloadLanguage } from "@/lib/pdf/language";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const language = pdfDownloadLanguage(request.nextUrl.searchParams.get("lang"));
  const built = await buildRecruitmentAgreementPdf(params.id, language);
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
