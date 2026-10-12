import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFoundContent() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center mb-4">
        <FileQuestion size={22} />
      </div>
      <h1 className="font-display text-xl font-semibold mb-1">Nothing here</h1>
      <p className="text-sm text-ink-muted mb-6">
        This page, quotation, or invoice doesn&rsquo;t exist.
      </p>
      <Link href="/" className="btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
}
