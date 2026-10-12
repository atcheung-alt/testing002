import { NextRequest, NextResponse } from "next/server";
import { getActivityTimeline } from "@/lib/activity";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const events = await getActivityTimeline("quotation", params.id);
  return NextResponse.json(events);
}
