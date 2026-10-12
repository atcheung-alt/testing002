"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarRange, X } from "lucide-react";

export default function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  function update(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextFrom) params.set("from", nextFrom);
    else params.delete("from");
    if (nextTo) params.set("to", nextTo);
    else params.delete("to");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <CalendarRange size={15} className="text-ink-faint shrink-0" />
      <input
        type="date"
        className="input !w-auto"
        aria-label="From date"
        value={from}
        max={to || undefined}
        onChange={(e) => update(e.target.value, to)}
      />
      <span className="text-ink-faint text-sm">–</span>
      <input
        type="date"
        className="input !w-auto"
        aria-label="To date"
        value={to}
        min={from || undefined}
        onChange={(e) => update(from, e.target.value)}
      />
      {(from || to) && (
        <button
          type="button"
          onClick={() => update("", "")}
          aria-label="Clear date range"
          className="text-ink-faint hover:text-danger-500 transition-colors"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
