import ClientsManager from "@/components/ClientsManager";

export const dynamic = "force-dynamic";

export default function ClientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">Clients</h1>
        <p className="text-sm text-ink-muted">
          Your client library — companies and individuals you&apos;ve worked with. Quotations and
          invoices still store their own customer details independently, so editing a client here
          never changes an already-created document.
        </p>
      </div>
      <ClientsManager />
    </div>
  );
}
