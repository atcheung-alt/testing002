import { Download } from "lucide-react";
import { PDF_DOWNLOAD_BUTTONS, appendPdfLanguage } from "@/lib/pdf/language";

/** Two matching download buttons: English, then Traditional Chinese.
 *  The choice is sent as `?lang=` and is not saved on the document. */
export default function DownloadPdfButton({ url }: { url: string }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      {PDF_DOWNLOAD_BUTTONS.map((option) => (
        <a
          key={option.lang}
          href={appendPdfLanguage(url, option.lang)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary whitespace-nowrap shrink-0"
        >
          <Download size={15} /> {option.label}
        </a>
      ))}
    </div>
  );
}
