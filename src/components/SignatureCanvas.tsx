"use client";

import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { SIGNATURE_CANVAS_WIDTH, SIGNATURE_CANVAS_HEIGHT } from "@/lib/signatureImage";

type Props = {
  onCommit: (dataUrl: string | null) => void;
  className?: string;
};

/** A draw-with-mouse-or-touch signature canvas with a Clear control. */
export default function SignatureCanvas({ onCommit, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0B1F3A";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * SIGNATURE_CANVAS_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * SIGNATURE_CANVAS_HEIGHT,
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    dirty.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && dirty.current) onCommit(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, SIGNATURE_CANVAS_WIDTH, SIGNATURE_CANVAS_HEIGHT);
    dirty.current = false;
    onCommit(null);
  }

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={SIGNATURE_CANVAS_WIDTH}
        height={SIGNATURE_CANVAS_HEIGHT}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full rounded-xl border border-line bg-white touch-none cursor-crosshair"
        style={{ aspectRatio: `${SIGNATURE_CANVAS_WIDTH} / ${SIGNATURE_CANVAS_HEIGHT}` }}
      />
      <button type="button" onClick={clear} className="btn-ghost mt-2 !px-2 text-xs">
        <Trash2 size={13} /> Clear
      </button>
    </div>
  );
}
