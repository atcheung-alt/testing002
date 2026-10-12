"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders its children directly into `document.body` instead of wherever
 * this component sits in the React tree — used for every full-screen
 * `position: fixed` modal/drawer in the app.
 *
 * Why this exists: a `fixed` element is normally positioned relative to the
 * viewport, but CSS makes an exception whenever an ANCESTOR has a
 * transform, filter, perspective, or `will-change` set to any of those —
 * that ancestor becomes the containing block instead, and the "fixed"
 * element ends up positioned/clipped relative to that ancestor's box
 * rather than the real viewport. This has already silently broken modals
 * twice in this app (once via the page-transition wrapper, once suspected
 * elsewhere) purely because some unrelated CSS elsewhere in the ancestor
 * chain happened to add one of those properties. A portal sidesteps the
 * problem entirely — rendered straight into `document.body`, a modal has
 * no page-content ancestors left to be broken by, no matter what CSS is
 * added anywhere else in the app in the future.
 *
 * The mount-gate (render nothing until after the initial client effect) is
 * required because `document` doesn't exist during server rendering.
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
