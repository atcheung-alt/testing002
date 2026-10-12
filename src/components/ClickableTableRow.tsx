"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

/**
 * A <tr> that navigates to `href` when clicked anywhere in the row — for
 * list tables where the whole line should act as a link, not just one
 * cell's text. Clicks that land on a real <a>/<button> inside the row (e.g.
 * an inline action) are left alone so those keep their own behavior
 * (including middle-click/cmd-click to open in a new tab) instead of also
 * triggering this row-level navigation.
 */
export default function ClickableTableRow({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function handleClick(e: MouseEvent<HTMLTableRowElement>) {
    if ((e.target as HTMLElement).closest("a, button")) return;
    router.push(href);
  }

  return (
    <tr onClick={handleClick} className={`cursor-pointer ${className}`}>
      {children}
    </tr>
  );
}
