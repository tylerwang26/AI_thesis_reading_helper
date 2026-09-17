"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { itemRects, itemsIntersecting, itemsToText } from "@/lib/pdf-text";
import { extractPdfOutline, scrollToOutlineTarget } from "@/lib/pdf-outline";
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

type DragBox = { x: number; y: number; w: number; h: number; page: number };

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
    setOutline,
    setOutlineReady,
    setPage,
    scale,
    setSelection,
    regionMode,
    runExplain,
    numPages,
    pages,
    selection,
    outlineJump,
  } = useReader();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [regionBox, setRegionBox] = useState<DragBox | null>(null);
  const [liveRects, setLiveRects] = useState<{ page: number; rects: OverlayRect[] } | null>(null);
  const regionDrag = useRef<{ x: number; y: number; page: number } | null>(null);
  const textDrag = useRef<{
    page: number;
    x0: number;
    y0: number;
    pointerId: number;
  } | null>(null);

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
      setOutlineReady(false);
      try {
        try {
          setOutline(await extractPdfOutline(pdf));
        } catch {
          setOutline([]);
        } finally {
          setOutlineReady(true);
        }
        const extracted: PageContent[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const pg = await pdf.getPage(i);
          const viewport = pg.getViewport({ scale: 1 });
          const content = await pg.getTextContent();
          const items: TextItemBox[] = [];
          for (const raw of content.items) {
            if (!("str" in raw)) continue;
            const t = raw.transform;
            const height = Math.abs(raw.height || t[3] || 10);
            const itemWidth = raw.width || Math.abs(t[0]) || 4;
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
    [setExtracting, setNumPages, setOutline, setOutlineReady, setPages],
  );

  useEffect(() => {
    if (!outlineJump || !numPages) return;
    const root = scrollerRef.current;
    if (!root) return;
    let cancelled = false;
    let attempts = 0;
    const run = () => {
      if (cancelled) return;
      if (scrollToOutlineTarget(root, outlineJump)) return;
      if (attempts++ < 30) requestAnimationFrame(run);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [outlineJump, numPages, paper?.url]);

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

  const pageContent = (pageNumber: number) => pages.find((p) => p.pageNumber === pageNumber);

  const clientToPdf = (wrap: HTMLElement, clientX: number, clientY: number, content: PageContent) => {
    const pageNode =
      (wrap.querySelector(".react-pdf__Page") as HTMLElement | null) ?? wrap;
    const r = pageNode.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / Math.max(r.width, 1)) * content.width,
      y: ((clientY - r.top) / Math.max(r.height, 1)) * content.height,
    };
  };

  const finishTextSelect = (
    wrap: HTMLElement,
    pageNumber: number,
    content: PageContent,
    x0: number,
    y0: number,
    clientX: number,
    clientY: number,
  ) => {
    const end = clientToPdf(wrap, clientX, clientY, content);
    const items = itemsIntersecting(content, x0, y0, end.x, end.y);
    const text = itemsToText(items);
    const rects = itemRects(content, items);
    textDrag.current = null;
    if (text.length < 2) {
      setLiveRects(null);
      return;
    }
    setLiveRects(null);
    const pageNode =
      (wrap.querySelector(".react-pdf__Page") as HTMLElement | null) ?? wrap;
    const r = pageNode.getBoundingClientRect();
    const anchor = rects[0];
    const rawX = r.left + (anchor.x + anchor.width / 2) * r.width;
    const rawY = r.top + anchor.y * r.height;
    setSelection({
      text,
      page: pageNumber,
      clientX: Math.min(Math.max(rawX, 96), window.innerWidth - 96),
      clientY: Math.min(Math.max(rawY, 64), window.innerHeight - 72),
      rects,
    });
  };

  const cropRegion = async (
    wrap: HTMLElement,
    box: { x: number; y: number; w: number; h: number },
  ) => {
    const canvas = wrap.querySelector("canvas");
    if (!canvas || box.w < 8 || box.h < 8) return;
    const canvasRect = canvas.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const left = box.x - (canvasRect.left - wrapRect.left);
    const top = box.y - (canvasRect.top - wrapRect.top);
    const scaleX = canvas.width / Math.max(canvasRect.width, 1);
    const scaleY = canvas.height / Math.max(canvasRect.height, 1);
    const sx = Math.max(0, left * scaleX);
    const sy = Math.max(0, top * scaleY);
    const sw = Math.min(canvas.width - sx, box.w * scaleX);
    const sh = Math.min(canvas.height - sy, box.h * scaleY);
    if (sw < 2 || sh < 2) return;
    const tmp = document.createElement("canvas");
    tmp.width = Math.max(1, Math.floor(sw));
    tmp.height = Math.max(1, Math.floor(sh));
    const ctx = tmp.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, tmp.width, tmp.height);
    await runExplain(undefined, tmp.toDataURL("image/png"));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>, pageNumber: number) => {
    if (event.button !== 0) return;
    const wrap = event.currentTarget;
    if (regionMode) {
      event.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      regionDrag.current = { x, y, page: pageNumber };
      setRegionBox({ x, y, w: 0, h: 0, page: pageNumber });
      wrap.setPointerCapture(event.pointerId);
      return;
    }
    const content = pageContent(pageNumber);
    if (!content) return;
    event.preventDefault();
    const start = clientToPdf(wrap, event.clientX, event.clientY, content);
    textDrag.current = { page: pageNumber, x0: start.x, y0: start.y, pointerId: event.pointerId };
    setLiveRects(null);
    setSelection(null);
    wrap.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>, pageNumber: number) => {
    const wrap = event.currentTarget;
    if (regionDrag.current) {
      const rect = wrap.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const o = regionDrag.current;
      setRegionBox({
        x: Math.min(o.x, x),
        y: Math.min(o.y, y),
        w: Math.abs(x - o.x),
        h: Math.abs(y - o.y),
        page: o.page,
      });
      return;
    }
    const drag = textDrag.current;
    if (!drag || drag.page !== pageNumber) return;
    const content = pageContent(pageNumber);
    if (!content) return;
    const end = clientToPdf(wrap, event.clientX, event.clientY, content);
    const items = itemsIntersecting(content, drag.x0, drag.y0, end.x, end.y);
    setLiveRects({ page: pageNumber, rects: itemRects(content, items) });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>, pageNumber: number) => {
    const wrap = event.currentTarget;
    if (regionDrag.current) {
      const origin = regionDrag.current;
      const rect = wrap.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const box = {
        x: Math.min(origin.x, x),
        y: Math.min(origin.y, y),
        w: Math.abs(x - origin.x),
        h: Math.abs(y - origin.y),
      };
      regionDrag.current = null;
      setRegionBox(null);
      void cropRegion(wrap, box);
      return;
    }
    const drag = textDrag.current;
    const content = pageContent(pageNumber);
    if (!drag || !content || drag.page !== pageNumber) {
      textDrag.current = null;
      return;
    }
    finishTextSelect(wrap, pageNumber, content, drag.x0, drag.y0, event.clientX, event.clientY);
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
  const selectionRects =
    liveRects ??
    (selection?.rects?.length ? { page: selection.page, rects: selection.rects } : null);

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
              className={`relative mx-auto mb-6 w-fit shadow-xl shadow-violet-950/10 ${
                regionMode ? "cursor-crosshair" : "cursor-text"
              }`}
              onPointerDown={(e) => onPointerDown(e, pageNumber)}
              onPointerMove={(e) => onPointerMove(e, pageNumber)}
              onPointerUp={(e) => onPointerUp(e, pageNumber)}
              onPointerCancel={() => {
                regionDrag.current = null;
                textDrag.current = null;
                setRegionBox(null);
                setLiveRects(null);
              }}
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                renderTextLayer
                renderAnnotationLayer={false}
                loading=""
              />
              <HighlightLayer marks={marks} />
              {selectionRects?.page === pageNumber ? (
                <HighlightLayer
                  marks={[
                    {
                      id: "live-selection",
                      page: pageNumber,
                      text: "",
                      color: "blue",
                      kind: "manual",
                      rects: selectionRects.rects,
                      createdAt: 0,
                    },
                  ]}
                />
              ) : null}
              {regionMode ? (
                <div className="pointer-events-none absolute inset-0 bg-violet-900/5" />
              ) : null}
              {regionBox && regionBox.page === pageNumber ? (
                <div
                  className="pointer-events-none absolute border-2 border-violet-600 bg-violet-400/20"
                  style={{
                    left: regionBox.x,
                    top: regionBox.y,
                    width: regionBox.w,
                    height: regionBox.h,
                  }}
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
    <div className="pointer-events-none absolute inset-0 z-[2]">
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
