import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, CheckCircle2, AlertCircle, PenLine } from 'lucide-react';

interface SignaturePadProps {
  value?: string;
  onChange: (signatureDataUrl: string) => void;
  required?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  required = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Initialize canvas with proper resolution
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set display size
    const width = rect.width || 340;
    const height = 170;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a'; // Deep slate ink
      ctx.lineWidth = 2.5;

      // Draw baseline guideline
      drawGuide(ctx, width, height);

      // If value exists, load it
      if (value) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          setIsEmpty(false);
          setHasDrawn(true);
        };
        img.src = value;
      }
    }
  }, [value]);

  const drawGuide = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#cbd5e1'; // Slate-300
    ctx.lineWidth = 1;
    ctx.moveTo(24, height - 36);
    ctx.lineTo(width - 24, height - 36);
    ctx.stroke();

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#94a3b8'; // Slate-400
    ctx.fillText('✕ Tanda Tangan Orang Tua / Wali di Atas Garis Ini', 26, height - 16);
    ctx.restore();
  };

  useEffect(() => {
    setupCanvas();

    const handleResize = () => {
      // Re-setup on resize
      setupCanvas();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture pointer to track smoothly even if finger moves slightly outside canvas
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture fails
    }

    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
    setIsEmpty(false);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    // Save as data URL
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width || 340;
    const height = 170;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    drawGuide(ctx, width, height);

    setIsEmpty(true);
    setHasDrawn(false);
    onChange('');
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-sm">
        <label className="font-semibold text-slate-800 flex items-center gap-1.5">
          <PenLine className="w-4 h-4 text-emerald-600" />
          <span>Tanda Tangan Digital Orang Tua / Wali</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
        {hasDrawn && !isEmpty ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Tersimpan
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Wajib tanda tangan
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative w-full rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden shadow-xs hover:border-emerald-400 focus-within:border-emerald-600 transition-colors"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          className="w-full cursor-crosshair block select-none"
          style={{ touchAction: 'none', minHeight: '170px' }}
        />

        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-slate-400 text-xs sm:text-sm font-medium tracking-wide">
              Goreskan tanda tangan di sini (Layar sentuh / Mouse)
            </p>
          </div>
        )}

        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            type="button"
            onClick={clearCanvas}
            className="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 active:bg-slate-300 px-2.5 py-1.5 rounded-lg font-medium transition shadow-xs"
            title="Hapus dan ulangi tanda tangan"
          >
            <Eraser className="w-3.5 h-3.5 text-slate-500" />
            <span>Hapus / Ulangi</span>
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        * Gunakan jari atau stylus pada smartphone/tablet, atau mouse pada komputer untuk membubuhkan tanda tangan resmi.
      </p>
    </div>
  );
};
