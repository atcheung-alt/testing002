import InvoiceForm from "@/components/InvoiceForm";

export default function NewInvoicePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">New invoice</h1>
        <p className="text-sm text-ink-muted">
          Create an invoice directly, or convert an accepted quotation instead.
        </p>
      </div>
      <InvoiceForm />
    </div>
  );
}
