import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const email = (request.nextUrl.searchParams.get("email") || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ exists: false });
  }
  const contact = await prisma.contactPerson.findUnique({ where: { email }, select: { id: true } });
  return NextResponse.json({ exists: Boolean(contact) });
}
