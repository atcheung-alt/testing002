import crypto from "crypto";
import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/** Generate a random, URL-safe signing token (192 bits of entropy). */
export function generateSigningToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/**
 * Resolve the public base URL used to build signing links. Prefers
 * NEXT_PUBLIC_APP_URL (set this in production behind a fixed domain); falls
 * back to the incoming request's own origin, which works out of the box in
 * development and single-instance deployments.
 */
export function resolveBaseUrl(request?: NextRequest | Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  if (request && "nextUrl" in request) return (request as NextRequest).nextUrl.origin;
  if (request) return new URL(request.url).origin;
  return "http://localhost:3000";
}

/** Build the full public signing URL for a token. */
export function signingUrlFor(token: string, request?: NextRequest | Request): string {
  return `${resolveBaseUrl(request)}/sign/${token}`;
}

/**
 * Same as `signingUrlFor`, but for use in Server Components (which don't
 * receive a `NextRequest`) — reads the incoming host via `next/headers`.
 */
export function signingUrlFromHeaders(token: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return `${envUrl.replace(/\/$/, "")}/sign/${token}`;
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}/sign/${token}`;
}

/**
 * Full public booking link for one event — e.g. `/book/{eventId}` — the
 * link staff copy from a booking event's detail page and send to clients.
 * Unlike the other public links here, there's no per-recipient token: the
 * same link works for every client of that event (see the schema comment on
 * BookingEvent for why the public booking page is one per event rather than
 * one shared form), so it's just the event's own id in the URL.
 */
export function bookingEventUrlFor(eventId: string, request?: NextRequest | Request): string {
  return `${resolveBaseUrl(request)}/book/${eventId}`;
}

/**
 * Same as `bookingEventUrlFor`, but for use in Server Components — reads the
 * incoming host via `next/headers`.
 */
export function bookingEventUrlFromHeaders(eventId: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return `${envUrl.replace(/\/$/, "")}/book/${eventId}`;
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}/book/${eventId}`;
}

/**
 * Full public "manage this event's bookings" link — e.g.
 * `/manage-booking/{manageToken}` — staff copy this from a booking event's
 * detail page and share it with whoever (not necessarily an HR Plus staff
 * account) should be able to edit that one event's slots/details and cancel
 * or delete its bookings. Unlike bookingEventUrlFor, this is not meant to be
 * public-public — treat it like a password, since anyone with the link can
 * manage that event.
 */
export function manageBookingEventUrlFor(manageToken: string, request?: NextRequest | Request): string {
  return `${resolveBaseUrl(request)}/manage-booking/${manageToken}`;
}

/**
 * Same as `manageBookingEventUrlFor`, but for use in Server Components —
 * reads the incoming host via `next/headers`.
 */
export function manageBookingEventUrlFromHeaders(manageToken: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return `${envUrl.replace(/\/$/, "")}/manage-booking/${manageToken}`;
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}/manage-booking/${manageToken}`;
}

/**
 * Full public self-service cancel link for one booking — e.g.
 * `/booking-cancel/{cancelToken}` — sent in the automatic confirmation email
 * so the client can cancel their own booking without staff involvement.
 */
export function bookingCancelUrlFor(cancelToken: string, request?: NextRequest | Request): string {
  return `${resolveBaseUrl(request)}/booking-cancel/${cancelToken}`;
}

/**
 * Same as `bookingCancelUrlFor`, but for use in Server Components — reads the
 * incoming host via `next/headers`.
 */
export function bookingCancelUrlFromHeaders(cancelToken: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return `${envUrl.replace(/\/$/, "")}/booking-cancel/${cancelToken}`;
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}/booking-cancel/${cancelToken}`;
}

/** Best-effort client IP extraction, respecting common proxy headers. */
export function getClientIp(request: NextRequest | Request): string | null {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

/**
 * Ensure a quotation has a signing token, generating and persisting one if it
 * doesn't yet (e.g. quotations created before this feature shipped). Returns
 * the token, or null if the quotation doesn't exist.
 */
export async function ensureSigningToken(quotationId: string): Promise<string | null> {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    select: { signingToken: true },
  });
  if (!quotation) return null;
  if (quotation.signingToken) return quotation.signingToken;

  const token = generateSigningToken();
  await prisma.quotation.update({
    where: { id: quotationId },
    data: { signingToken: token },
  });
  return token;
}

/** Build the full public "view & pay" URL for an invoice token. */
export function invoiceViewUrlFor(token: string, request?: NextRequest | Request): string {
  return `${resolveBaseUrl(request)}/invoice/${token}`;
}

/**
 * Same as `invoiceViewUrlFor`, but for use in Server Components — reads the
 * incoming host via `next/headers`.
 */
export function invoiceViewUrlFromHeaders(token: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return `${envUrl.replace(/\/$/, "")}/invoice/${token}`;
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}/invoice/${token}`;
}

/**
 * Ensure an invoice has a view token, generating and persisting one if it
 * doesn't yet. Returns the token, or null if the invoice doesn't exist.
 */
export async function ensureInvoiceViewToken(invoiceId: string): Promise<string | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { viewToken: true },
  });
  if (!invoice) return null;
  if (invoice.viewToken) return invoice.viewToken;

  const token = generateSigningToken();
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { viewToken: token },
  });
  return token;
}

/** Build the full public signing URL for a recruitment agreement token. */
export function recruitmentSigningUrlFor(token: string, request?: NextRequest | Request): string {
  return `${resolveBaseUrl(request)}/recruitment-sign/${token}`;
}

/**
 * Same as `recruitmentSigningUrlFor`, but for use in Server Components —
 * reads the incoming host via `next/headers`.
 */
export function recruitmentSigningUrlFromHeaders(token: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return `${envUrl.replace(/\/$/, "")}/recruitment-sign/${token}`;
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}/recruitment-sign/${token}`;
}

/**
 * Ensure a recruitment agreement has a signing token, generating and
 * persisting one if it doesn't yet. Returns the token, or null if the
 * agreement doesn't exist.
 */
export async function ensureRecruitmentSigningToken(agreementId: string): Promise<string | null> {
  const agreement = await prisma.recruitmentAgreement.findUnique({
    where: { id: agreementId },
    select: { signingToken: true },
  });
  if (!agreement) return null;
  if (agreement.signingToken) return agreement.signingToken;

  const token = generateSigningToken();
  await prisma.recruitmentAgreement.update({
    where: { id: agreementId },
    data: { signingToken: token },
  });
  return token;
}

/** Build the full public self-service leave URL for an employee's token. */
export function leaveUrlFor(token: string, request?: NextRequest | Request): string {
  return `${resolveBaseUrl(request)}/leave/${token}`;
}

/**
 * Same as `leaveUrlFor`, but for use in Server Components — reads the
 * incoming host via `next/headers`.
 */
export function leaveUrlFromHeaders(token: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return `${envUrl.replace(/\/$/, "")}/leave/${token}`;
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}/leave/${token}`;
}

/**
 * Ensure an employee has a leave-link token, generating and persisting one
 * if it doesn't yet (e.g. employees added before this feature shipped).
 * Returns the token, or null if the employee doesn't exist.
 */
export async function ensureLeaveToken(employeeId: string): Promise<string | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { leaveToken: true },
  });
  if (!employee) return null;
  if (employee.leaveToken) return employee.leaveToken;

  const token = generateSigningToken();
  await prisma.employee.update({
    where: { id: employeeId },
    data: { leaveToken: token },
  });
  return token;
}

/** Build the full public self-service onboarding URL for an employee's token. */
export function onboardingUrlFor(token: string, request?: NextRequest | Request): string {
  return `${resolveBaseUrl(request)}/onboarding/${token}`;
}

/**
 * Same as `onboardingUrlFor`, but for use in Server Components — reads the
 * incoming host via `next/headers`.
 */
export function onboardingUrlFromHeaders(token: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return `${envUrl.replace(/\/$/, "")}/onboarding/${token}`;
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}/onboarding/${token}`;
}

/**
 * Ensure an employee has an onboarding-link token, generating and
 * persisting one if it doesn't yet. Returns the token, or null if the
 * employee doesn't exist. Unlike the leave token, this one is meant to be
 * emailed directly (see /api/employees/invite and
 * /api/employees/[id]/onboarding/send) rather than just copied.
 */
export async function ensureOnboardingToken(employeeId: string): Promise<string | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { onboardingToken: true },
  });
  if (!employee) return null;
  if (employee.onboardingToken) return employee.onboardingToken;

  const token = generateSigningToken();
  await prisma.employee.update({
    where: { id: employeeId },
    data: { onboardingToken: token },
  });
  return token;
}

/** Build the full public signing URL for an employment contract token. */
export function employeeContractSigningUrlFor(token: string, request?: NextRequest | Request): string {
  return `${resolveBaseUrl(request)}/contract-sign/${token}`;
}

/**
 * Same as `employeeContractSigningUrlFor`, but for use in Server Components —
 * reads the incoming host via `next/headers`.
 */
export function employeeContractSigningUrlFromHeaders(token: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return `${envUrl.replace(/\/$/, "")}/contract-sign/${token}`;
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}/contract-sign/${token}`;
}

/**
 * Ensure an employee's contract has a signing token, generating and
 * persisting one if it doesn't yet. Returns the token, or null if the
 * contract doesn't exist (create it first via the contract details form).
 */
export async function ensureEmployeeContractSigningToken(contractId: string): Promise<string | null> {
  const contract = await prisma.employeeContract.findUnique({
    where: { id: contractId },
    select: { signingToken: true },
  });
  if (!contract) return null;
  if (contract.signingToken) return contract.signingToken;

  const token = generateSigningToken();
  await prisma.employeeContract.update({
    where: { id: contractId },
    data: { signingToken: token },
  });
  return token;
}
