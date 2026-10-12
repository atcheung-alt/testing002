import FeeScaleManager from "@/components/FeeScaleManager";

export const dynamic = "force-dynamic";

export default function FeeScalePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">Fee scale library</h1>
        <p className="text-sm text-ink-muted">
          Manage the standard rates that pre-fill Clause 13.b&apos;s two fee scale tables on a{" "}
          <strong>new</strong> agreement — add, edit, or delete rows the same way you manage the
          item library. Each agreement gets its own editable copy from there, so this only sets the
          starting point.
        </p>
      </div>
      <FeeScaleManager />
    </div>
  );
}
