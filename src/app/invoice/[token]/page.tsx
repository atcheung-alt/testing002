import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { getPublicInvoiceView } from "@/lib/publicInvoice";
import InvoicePaymentClient from "@/components/InvoicePaymentClient";
import { COMPANY } from "@/lib/company";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const view = await getPublicInvoiceView(params.token);
  return {
    title: view
      ? `Invoice ${view.number} — ${COMPANY.shortName || COMPANY.name}`
      : `Invoice link — ${COMPANY.shortName || COMPANY.name}`,
    // Invoice links are shared privately by email/token and must never be
    // indexed or surfaced by search engines.
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function PublicInvoicePage({ params }: { params: { token: string } }) {
  const view = await getPublicInvoiceView(params.token);

  if (!view) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 flex flex-col items-center text-center gap-3">
        <ShieldAlert size={40} className="text-danger-500" />
        <h1 className="font-display text-xl font-semibold text-ink">
          This invoice link isn&apos;t valid
        </h1>
        <p className="text-sm text-ink-muted">
          It may have been mistyped, or the invoice it points to no longer exists. Please contact{" "}
          {COMPANY.contact?.email || COMPANY.shortName || COMPANY.name} if you believe this is a
          mistake.
        </p>
      </div>
    );
  }

  return <InvoicePaymentClient token={params.token} initial={view} />;
}
