import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { buildPayslipPdf } from "@/lib/pdf/build";
import { pdfContentDisposition, pdfDownloadLanguage } from "@/lib/pdf/language";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const language = pdfDownloadLanguage(request.nextUrl.searchParams.get("lang"));
  const built = await buildPayslipPdf(params.id, params.entryId, language);
  if (!built) {
    return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(built.buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": pdfContentDisposition(`${built.employeeName} - ${built.periodLabel}.pdf`, language),
    },
  });
}
