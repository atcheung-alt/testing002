import { NextRequest, NextResponse } from "next/server";
import { buildInvoicePdf } from "@/lib/pdf/build";

export const runtime = "nodejs";

const PDF_LANGUAGES = new Set(["EN", "ZH_HANT", "ZH_HANS"]);

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requested = request.nextUrl.searchParams.get("lang");
  const language = requested && PDF_LANGUAGES.has(requested) ? requested : undefined;
  const built = await buildInvoicePdf(params.id, language);
  if (!built) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const suffix =
    language === "ZH_HANT" ? "-zh-hant" : language === "ZH_HANS" ? "-zh-hans" : language === "EN" ? "-en" : "";

  return new NextResponse(new Uint8Array(built.buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${built.number}${suffix}.pdf"`,
    },
  });
}
