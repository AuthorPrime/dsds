/**
 * PdfViewer — Canvas-based PDF renderer using pdf.js.
 *
 * Tauri's WebView has no built-in PDF viewer, so we can't just iframe a blob URL.
 * This component loads the PDF with pdf.js and renders each page to a <canvas>.
 * Each page manages its own render lifecycle so zoom changes re-render cleanly.
 */

import { useEffect, useRef, useState } from 'react';
import { getPdfjs } from '../utils/pdfExtract';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { AlertCircle } from 'lucide-react';

interface PdfViewerProps {
  /** Blob URL (from URL.createObjectURL) or File object */
  src: string;
  /** Zoom percentage — 100 = natural size */
  zoom: number;
}

/**
 * Renders a single PDF page to a canvas.
 * Accounts for devicePixelRatio for crisp rendering on HiDPI displays.
 */
function PdfPage({ pdf, pageNum, zoom, total }: {
  pdf: PDFDocumentProxy;
  pageNum: number;
  zoom: number;
  total: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const el = canvas; // capture non-null ref for async closure

    (async () => {
      const page = await pdf.getPage(pageNum);
      if (cancelled) return;

      const dpr = window.devicePixelRatio || 1;
      const scale = (zoom / 100) * dpr;
      const viewport = page.getViewport({ scale });

      el.width = viewport.width;
      el.height = viewport.height;
      el.style.width = `${viewport.width / dpr}px`;
      el.style.height = `${viewport.height / dpr}px`;

      const ctx = el.getContext('2d');
      if (ctx && !cancelled) {
        try {
          await page.render({ canvasContext: ctx, canvas: el, viewport }).promise;
        } catch {
          // Render cancelled — expected when zoom changes rapidly
        }
      }
    })();

    return () => { cancelled = true; };
  }, [pdf, pageNum, zoom]);

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        className="shadow-2xl bg-white rounded"
      />
      <div className="absolute bottom-2 right-3 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
        {pageNum} / {total}
      </div>
    </div>
  );
}

export function PdfViewer({ src, zoom }: PdfViewerProps) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const pdfjsLib = await getPdfjs();
        const response = await fetch(src);
        const data = await response.arrayBuffer();
        if (cancelled) return;

        const doc = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;

        setPdf(doc);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [src]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="w-7 h-7 border-2 border-gray-600 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error || !pdf) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        <div className="text-center">
          <AlertCircle size={32} className="mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium">Failed to load PDF</p>
          <p className="text-xs mt-1 text-gray-500">{error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4 px-4">
      {Array.from({ length: pdf.numPages }, (_, i) => i + 1).map(pageNum => (
        <PdfPage key={pageNum} pdf={pdf} pageNum={pageNum} zoom={zoom} total={pdf.numPages} />
      ))}
    </div>
  );
}
