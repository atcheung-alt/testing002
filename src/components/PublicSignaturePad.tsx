"use client";

import { useEffect, useState } from "react";
import { Pen, Type, Check } from "lucide-react";
import SignatureCanvas from "@/components/SignatureCanvas";
import { typedSignatureToDataUrl } from "@/lib/signatureImage";

type Mode = "draw" | "type";

type Props = {
  /** Full name from the form above — used to render the typed signature. */
  fullName: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
};

/**
 * Signature capture for the public signing page: draw with mouse/touch, or
 * have the typed full name rendered in a handwriting font. Deliberately
 * simpler than the staff-facing SignaturePad (no image upload) — this is a
 * client acceptance signature, not a scanned company stamp.
 */
export default function PublicSignaturePad({ fullName, value, onChange }: Props) {
  const [mode, setMode] = useState<Mode>("draw");

  // Keep the typed signature in sync with the name field while in Type mode.
  useEffect(() => {
    if (mode !== "type") return;
    onChange(fullName.trim() ? typedSignatureToDataUrl(fullName.trim()) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, fullName]);

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex rounded-full border border-line bg-white p-0.5 self-start">
        {(
          [
            { id: "draw" as const, label: "Draw", icon: Pen },
            { id: "type" as const, label: "Type", icon: Type },
          ]
        ).map((t) => {
          const Icon = t.icon;
          const active = mode === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setMode(t.id);
                onChange(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active ? "bg-brand-gradient text-white shadow-soft" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {mode === "draw" && <SignatureCanvas onCommit={onChange} />}

      {mode === "type" && (
        <div className="rounded-xl border border-line bg-white px-4 py-6 flex items-center justify-center min-h-[100px]">
          {fullName.trim() ? (
            <span className="font-signature text-4xl sm:text-5xl text-brand-900 leading-none">
              {fullName}
            </span>
          ) : (
            <span className="text-sm text-ink-faint">
              Enter your full name above to preview your signature
            </span>
          )}
        </div>
      )}

      {value && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-brand-700">
          <Check size={14} /> Signature ready
        </div>
      )}
    </div>
  );
}
