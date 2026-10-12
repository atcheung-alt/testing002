// Shared dimensions and rendering used by every signature-capture surface
// (the staff-facing SignaturePad and the public quotation signing page), so
// drawn and typed signatures are always the same size and style.

export const SIGNATURE_CANVAS_WIDTH = 520;
export const SIGNATURE_CANVAS_HEIGHT = 180;

/** Render typed text in a handwriting font to a transparent PNG data URL. */
export function typedSignatureToDataUrl(
  text: string,
  width = SIGNATURE_CANVAS_WIDTH,
  height = SIGNATURE_CANVAS_HEIGHT
): string | null {
  if (!text.trim()) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0B1F3A";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Shrink font until the text fits the canvas width.
  let fontSize = 84;
  const font = (size: number) => `${size}px "Allura", "Brush Script MT", cursive`;
  ctx.font = font(fontSize);
  while (ctx.measureText(text).width > width - 48 && fontSize > 24) {
    fontSize -= 2;
    ctx.font = font(fontSize);
  }
  ctx.fillText(text, width / 2, height / 2);
  return canvas.toDataURL("image/png");
}
