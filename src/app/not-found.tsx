import NotFoundContent from "@/components/NotFoundContent";

// Used for genuinely unmatched top-level paths. Pages inside the (app) group
// use (app)/not-found.tsx instead, so quotation/invoice "not found" cases
// still render inside the staff Sidebar shell.
//
// Next.js statically prerenders `not-found.tsx` at BUILD time by default,
// regardless of any dynamic API usage in ancestor layouts — which meant the
// root layout's `headers()`/`cookies()`-based theme resolution got baked in
// once, at whatever the company theme happened to be during that specific
// build (with no signed-in user, since there's no real request), and stayed
// that way until the next deploy. Forcing this dynamic makes it recompute
// the theme per-request like every real page.tsx in the app already does.
export const dynamic = "force-dynamic";

export default function NotFound() {
  return <NotFoundContent />;
}
