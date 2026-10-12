import { NextRequest, NextResponse } from "next/server";
import { isDriveConfigured } from "@/lib/googleDrive";
import { syncInvoiceRecordToDrive } from "@/lib/driveSync";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!isDriveConfigured()) {
    return NextResponse.json(
      { error: "Google Drive isn't configured on the server (see .env.example)." },
      { status: 400 }
    );
  }

  const warning = await syncInvoiceRecordToDrive(params.id);
  return NextResponse.json({ success: !warning, warning });
}
