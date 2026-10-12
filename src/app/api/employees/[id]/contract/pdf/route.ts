import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { buildEmployeeContractPdf } from "@/lib/pdf/build";
import { pdfContentDisposition, pdfDownloadLanguage } from "@/lib/pdf/language";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const language = pdfDownloadLanguage(request.nextUrl.searchParams.get("lang"));
  const built = await buildEmployeeContractPdf(params.id, language);
  if (!built) {
    return NextResponse.json({ error: "This employee has no contract yet." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(built.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": pdfContentDisposition(
        `${built.employeeName.replace(/\s+/g, "-")}-contract.pdf`,
        language
      ),
    },
  });
}
