import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { NextRequest } from "next/server";
import { resolveBaseUrl } from "@/lib/signing";

export function isGoogleLoginConfigured(): boolean {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

function redirectUri(request: NextRequest): string {
  return `${resolveBaseUrl(request)}/api/auth/google/callback`;
}

function getClient(request: NextRequest): OAuth2Client {
  return new OAuth2Client({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: redirectUri(request),
  });
}

/** Only allow relative, same-site redirect targets — never an absolute/external URL. */
function sanitizeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

/**
 * Encodes the CSRF nonce and the post-login redirect target together into
 * the OAuth `state` param, so we don't need a second cookie to remember
 * `next` across the round trip to Google and back.
 */
export function buildState(nonce: string, next: string | null): string {
  const safeNext = sanitizeNextPath(next);
  return `${nonce}.${Buffer.from(safeNext, "utf8").toString("base64url")}`;
}

export function parseState(state: string | null): { nonce: string; next: string } {
  if (!state) return { nonce: "", next: "/" };
  const [nonce, encodedNext] = state.split(".");
  let next = "/";
  try {
    next = sanitizeNextPath(Buffer.from(encodedNext || "", "base64url").toString("utf8"));
  } catch {
    next = "/";
  }
  return { nonce: nonce || "", next };
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("base64url");
}

export function buildGoogleAuthUrl(request: NextRequest, state: string): string {
  const client = getClient(request);
  return client.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    state,
  });
}

export type GoogleProfile = {
  email: string;
  emailVerified: boolean;
  name: string;
};

/** Exchange the authorization code for tokens and verify the ID token's signature + audience. */
export async function verifyGoogleAuthCode(
  request: NextRequest,
  code: string
): Promise<GoogleProfile | null> {
  const client = getClient(request);
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) return null;

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) return null;

  return {
    email: payload.email.toLowerCase(),
    emailVerified: Boolean(payload.email_verified),
    name: payload.name || payload.email,
  };
}
