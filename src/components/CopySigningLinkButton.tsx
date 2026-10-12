"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, Check } from "lucide-react";

export default function CopySigningLinkButton({
  url,
  label = "Copy signing link",
  copiedLabel = "Copied",
  title = "Copy the public signing link",
}: {
  url: string;
  label?: string;
  copiedLabel?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — fall back silently.
      window.prompt("Copy the link:", url);
    }
  }

  return (
    <button type="button" onClick={copy} className="btn-secondary" title={title}>
      {copied ? <Check size={15} /> : <Link2 size={15} />}
      {copied ? copiedLabel : label}
    </button>
  );
}
