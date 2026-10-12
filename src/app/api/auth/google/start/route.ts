import { NextRequest, NextResponse } from "next/server";
import {
  isGoogleLoginConfigured,
  buildGoogleAuthUrl,
  buildState,
  generateNonce,
} from "@/lib/googleOAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NONCE_COOKIE = "google_oauth_nonce";

export async function GET(request: NextRequest) {
  if (!isGoogleLoginConfigured()) {
    return NextResponse.redirect(new URL("/login?error=not_configured", request.url));
  }

  const next = request.nextUrl.searchParams.get("next");
  const nonce = generateNonce();
  const state = buildState(nonce, next);

  const response = NextResponse.redirect(buildGoogleAuthUrl(request, state));
  response.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 300, // 5 minutes — this cookie only needs to survive the round trip to Google and back
  });
  return response;
}
