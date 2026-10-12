"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";

/**
 * Read an image file and downscale it to max 480px, returning a PNG data
 * URL. Unlike the item-image uploader, this keeps transparency (no white
 * fill) since the logo sits directly on a white PDF page / email header.
 */
export function fileToLogoDataUrl(file: File, maxSize = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("The selected file is not a valid image."));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process the image."));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function CompanyLogoUpload({
  imageData,
  onChange,
  label = "company logo",
}: {
  imageData?: string | null;
  onChange: (data: string | null) => void;
  /** Distinguishes the accessible name/title when more than one upload
   *  control is on the same page (e.g. "primary company logo" vs "dark
   *  mode company logo") — purely a11y/tooltip text, no behavior change. */
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    try {
      onChange(await fileToLogoDataUrl(file));
    } catch {
      // silently ignore invalid files
    }
  }

  return (
    <div className="shrink-0">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {imageData ? (
        <div className="relative w-32 h-20 bg-white rounded-md border border-line flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageData}
            alt={label}
            className="max-w-[112px] max-h-16 object-contain cursor-pointer"
            onClick={() => inputRef.current?.click()}
            title={`Click to replace ${label}`}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Remove ${label}`}
            className="absolute -top-1.5 -right-1.5 bg-white border border-line rounded-full p-0.5 text-ink-faint hover:text-danger-500 shadow-sm"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={`Upload ${label}`}
          title={`Upload ${label}`}
          className="w-32 h-20 flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line text-ink-faint hover:text-brand-600 hover:border-brand-500/60 transition-colors"
        >
          <ImagePlus size={20} />
          <span className="text-[11px] leading-none">Upload logo</span>
        </button>
      )}
    </div>
  );
}
