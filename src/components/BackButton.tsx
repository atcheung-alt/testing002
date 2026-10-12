"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Real browser back navigation, not a plain `<Link href={fallbackHref}>` —
 * the list pages this leaves from (invoices, quotations) keep their search/
 * status/date filters and scroll position entirely in the URL and browser
 * history, so `router.back()` lands exactly back where the user was
 * (same query string, same scroll offset) instead of reloading a fresh,
 * filterless list from the top. Falls back to `fallbackHref` only when
 * there's no in-app history to go back to (e.g. the page was opened
 * directly via a bookmark or new tab).
 */
export default function BackButton({ fallbackHref, label }: { fallbackHref: string; label: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className="text-sm text-ink-muted hover:text-ink flex items-center gap-1 w-fit"
    >
      <ArrowLeft size={14} /> {label}
    </button>
  );
}
