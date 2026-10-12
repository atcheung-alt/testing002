import NotFoundContent from "@/components/NotFoundContent";

// See the header comment on src/app/not-found.tsx — Next statically
// prerenders not-found.tsx at build time by default, which bakes in
// whatever theme happened to resolve during that specific build rather than
// the live setting. Forcing this dynamic fixes that the same way.
export const dynamic = "force-dynamic";

export default function NotFound() {
  return <NotFoundContent />;
}
