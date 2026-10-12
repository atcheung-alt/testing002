import { NextRequest, NextResponse } from "next/server";
import { getPublicEmployeeLeaveView } from "@/lib/publicEmployeeLeave";

export const runtime = "nodejs";

/**
 * Public, token-scoped employee leave-balance/history lookup for the
 * /leave/[token] page. No authentication — the random leave token itself
 * is the access control, exactly like the quotation signing link.
 */
export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const view = await getPublicEmployeeLeaveView(params.token);
  if (!view) {
    return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 404 });
  }
  return NextResponse.json(view);
}
