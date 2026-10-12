import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildEmployeeContractPdf } from "@/lib/pdf/build";
import { pdfContentDisposition, pdfDownloadLanguage } from "@/lib/pdf/language";

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const language = pdfDownloadLanguage(request.nextUrl.searchParams.get("lang"));
  const contract = await prisma.employeeContract.findUnique({
    where: { signingToken: params.token },
    select: { employeeId: true },
  });
  if (!contract) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 404 });
  }

  const built = await buildEmployeeContractPdf(contract.employeeId, language);
  if (!built) {
    return NextResponse.json({ error: "This contract is no longer available." }, { status: 404 });
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
