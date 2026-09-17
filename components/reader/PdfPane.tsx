"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { OverlayRect, PageContent, PaperHighlight, TextItemBox } from "@/lib/types";
import { useReader } from "./reader-context";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

const colorClass: Record<PaperHighlight["color"], string> = {
  yellow: "bg-yellow-300/50",
  green: "bg-emerald-300/45",
  blue: "bg-sky-300/45",
  pink: "bg-pink-300/50",
  orange: "bg-amber-300/50",
};

export function PdfPane() {
  const {
    copy,
    paper,
    openSample,
    openFilePicker,
    highlights,
    setNumPages,
    setPages,
    setExtracting,
    setPage,
    page,
    scale,
    setSelection,
    regionMode,
    runExplain,
    numPages,
  } = useReader();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [drag, setDrag] = useState<{ x: number; y: number; w: number; h: number; page: number } | null>(null);
  const dragOrigin = useRef<{ x: number; y: number; page: number } | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(320, el.clientWidth - 48));
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, [paper]);

  const onLoad = useCallback(
    async (pdf: PDFDocumentProxy) => {
      setNumPages(pdf.numPages);
      setExtracting(true);
      try {
        const extracted: PageContent[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const pg = await pdf.getPage(i);
          const viewport = pg.getViewport({ scale: 1 });
          const content = await pg.getTextContent();
          const items: TextItemBox[] = [];
          for (const raw of content.items) {
            if (!("str" in raw)) continue;
            const t = raw.transform;
            const height = raw.height || Math.abs(t[3]) || 10;
            const itemWidth = raw.width || Math.abs(t[0]) * raw.str.length * 0.5 || 4;
            items.push({
              str: raw.str,
              x: t[4],
              y: viewport.height - t[5] - height,
              width: itemWidth,
              height,
            });
          }
          extracted.push({
            pageNumber: i,
            text: items.map((it) => it.str).join(" "),
            items,
            width: viewport.width,
            height: viewport.height,
          });
        }
        setPages(extracted);
      } finally {
        setExtracting(false);
      }
    },
    [setExtracting, setNumPages, setPages],
  );

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const onUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().replace(/\s+/g, " ").trim();
      if (text.length < 2) return;
      const node = sel.anchorNode;
      const el = node instanceof Element ? node : node?.parentElement;
      if (!el || !root.contains(el)) return;
      const pageEl = el.closest("[data-page-number]");
      const pageNumber = Number(pageEl?.getAttribute("data-page-number") || page);
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setSelection({
        text,
        page: pageNumber,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top,
      });
    };
    document.addEventListener("mouseup", onUp);
    return () => document.removeEventListener("mouseup", onUp);
  }, [page, setSelection]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || !numPages) return;
    const els = [...root.querySelectorAll("[data-page-number]")];
    const obs = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (best) {
          const n = Number(best.target.getAttribute("data-page-number"));
          if (n) setPage(n);
        }
      },
      { root, threshold: [0.2, 0.4, 0.6] },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [numPages, paper?.url, setPage]);

  const startDrag = (event: React.MouseEvent, pageNumber: number) => {
    if (!regionMode) return;
    const wrap = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - wrap.left;
    const y = event.clientY - wrap.top;
    dragOrigin.current = { x, y, page: pageNumber };
    setDrag({ x, y, w: 0, h: 0, page: pageNumber });
  };

  const moveDrag = (event: React.MouseEvent) => {
    if (!dragOrigin.current) return;
    const wrap = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - wrap.left;
    const y = event.clientY - wrap.top;
    const o = dragOrigin.current;
    setDrag({
      x: Math.min(o.x, x),
      y: Math.min(o.y, y),
      w: Math.abs(x - o.x),
      h: Math.abs(y - o.y),
      page: o.page,
    });
  };

  const endDrag = async (event: React.MouseEvent) => {
    if (!dragOrigin.current || !drag) {
      dragOrigin.current = null;
      setDrag(null);
      return;
    }
    const wrapEl = event.currentTarget as HTMLElement;
    const canvas = wrapEl.querySelector("canvas");
    const box = drag;
    dragOrigin.current = null;
    setDrag(null);
    if (!canvas || box.w < 8 || box.h < 8) return;
    const scaleX = canvas.width / wrapEl.clientWidth;
    const tmp = document.createElement("canvas");
    tmp.width = Math.max(1, Math.floor(box.w * scaleX));
    tmp.height = Math.max(1, Math.floor(box.h * scaleX));
    const ctx = tmp.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      canvas,
      box.x * scaleX,
      box.y * scaleX,
      tmp.width,
      tmp.height,
      0,
      0,
      tmp.width,
      tmp.height,
    );
    await runExplain(undefined, tmp.toDataURL("image/png"));
  };

  if (!paper) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-violet-900/70">
        <p className="text-lg font-medium text-violet-950">{copy.noPaper}</p>
        <p className="text-sm">{copy.dropHint}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="rounded-full bg-violet-950 px-4 py-2 text-sm text-white"
            onClick={openSample}
          >
            {copy.openSample}
          </button>
          <button
            type="button"
            className="rounded-full border border-violet-200 px-4 py-2 text-sm"
            onClick={openFilePicker}
          >
            {copy.uploadPaper}
          </button>
        </div>
      </div>
    );
  }

  const pageWidth = Math.min(width, 920) * scale;

  return (
    <div ref={scrollerRef} className="h-full overflow-auto bg-[#f3f0fb] px-4 py-6">
      <Document
        file={paper.url}
        onLoadSuccess={(pdf) => void onLoad(pdf)}
        loading={<p className="text-center text-sm text-violet-800">{copy.loadingPdf}</p>}
        error={<p className="text-center text-sm text-red-700">Could not render this PDF.</p>}
      >
        {Array.from({ length: numPages }, (_, i) => {
          const pageNumber = i + 1;
          const marks = highlights.filter((h) => h.page === pageNumber);
          return (
            <div
              key={pageNumber}
              data-page-number={pageNumber}
              className="relative mx-auto mb-6 w-fit shadow-xl shadow-violet-950/10"
              onMouseDown={(e) => startDrag(e, pageNumber)}
              onMouseMove={moveDrag}
              onMouseUp={(e) => void endDrag(e)}
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                renderTextLayer
                renderAnnotationLayer
                loading=""
              />
              <HighlightLayer marks={marks} />
              {regionMode ? (
                <div className="absolute inset-0 cursor-crosshair bg-violet-900/5" />
              ) : null}
              {drag && drag.page === pageNumber ? (
                <div
                  className="pointer-events-none absolute border-2 border-violet-600 bg-violet-400/20"
                  style={{ left: drag.x, top: drag.y, width: drag.w, height: drag.h }}
                />
              ) : null}
            </div>
          );
        })}
      </Document>
    </div>
  );
}

function HighlightLayer({ marks }: { marks: PaperHighlight[] }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {marks.flatMap((mark) =>
        mark.rects.map((rect: OverlayRect, i) => (
          <div
            key={`${mark.id}-${i}`}
            className={`absolute rounded-sm ${colorClass[mark.color]} ${
              mark.kind === "auto" ? "underline decoration-violet-700/40 decoration-2" : ""
            }`}
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.width * 100}%`,
              height: `${rect.height * 100}%`,
            }}
            title={mark.reason || mark.note || mark.text}
          />
        )),
      )}
    </div>
  );
}
