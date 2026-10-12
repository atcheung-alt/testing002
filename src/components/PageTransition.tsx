"use client";

import { usePathname } from "next/navigation";

/**
 * Gives every route change a small fade-in-up entrance instead of content
 * just popping in. The App Router keeps this layout mounted across
 * navigations (only `children` swaps), so the animation needs a fresh
 * element to play on — keying the wrapper by pathname forces React to
 * remount it (and replay the CSS animation) on every navigation, while
 * staying inert on re-renders that don't change the route. Turned off
 * entirely by the `[data-animations="off"]` kill-switch in globals.css.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-fade-in-up">
      {children}
    </div>
  );
}
