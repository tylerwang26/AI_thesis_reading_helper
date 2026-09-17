import type { PDFDocumentProxy } from "pdfjs-dist";
import type { OutlineJump, OutlineNode } from "./types";

type PdfOutline = Awaited<ReturnType<PDFDocumentProxy["getOutline"]>>[number];

function destKind(entry: unknown): string {
  if (!entry) return "XYZ";
  if (typeof entry === "string") return entry;
  if (typeof entry === "object" && entry && "name" in (entry as { name?: string })) {
    return String((entry as { name: string }).name);
  }
  return "XYZ";
}

function isRefProxy(value: unknown): value is { num: number; gen: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { num?: unknown }).num === "number"
  );
}

function clamp01(n: number) {
  return Math.min(0.98, Math.max(0, n));
}

async function resolveDest(
  pdf: PDFDocumentProxy,
  dest: string | unknown[] | null,
): Promise<{ page: number; top: number | null } | null> {
  if (!dest) return null;
  let explicit: unknown[] | null = Array.isArray(dest) ? dest : null;
  if (typeof dest === "string") {
    explicit = await pdf.getDestination(dest);
  }
  if (!explicit?.length) return null;

  const destRef = explicit[0];
  let pageIndex: number | null = null;
  try {
    if (isRefProxy(destRef)) {
      pageIndex = await pdf.getPageIndex({
        num: destRef.num,
        gen: typeof destRef.gen === "number" ? destRef.gen : 0,
      });
    } else if (typeof destRef === "number" && Number.isInteger(destRef)) {
      pageIndex = destRef;
    }
  } catch {
    pageIndex = null;
  }
  if (pageIndex == null || pageIndex < 0) return null;

  const pageNumber = pageIndex + 1;
  const kind = destKind(explicit[1]);
  let pdfTop: number | null = null;
  if (kind === "XYZ" && typeof explicit[3] === "number") pdfTop = explicit[3];
  else if ((kind === "FitH" || kind === "FitBH") && typeof explicit[2] === "number") {
    pdfTop = explicit[2];
  } else if (kind === "FitR" && typeof explicit[5] === "number") pdfTop = explicit[5];

  let top: number | null = 0;
  if (pdfTop != null) {
    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const [, vy] = viewport.convertToViewportPoint(0, pdfTop);
      top = clamp01(vy / Math.max(viewport.height, 1));
    } catch {
      top = null;
    }
  }
  return { page: pageNumber, top };
}

export async function extractPdfOutline(pdf: PDFDocumentProxy): Promise<OutlineNode[]> {
  const raw = await pdf.getOutline();
  if (!raw?.length) return [];
  let seq = 0;

  const walk = async (nodes: PdfOutline[]): Promise<OutlineNode[]> => {
    const out: OutlineNode[] = [];
    for (const node of nodes) {
      const loc = await resolveDest(pdf, node.dest);
      out.push({
        id: `ol-${seq++}`,
        title: (node.title || "").replace(/\s+/g, " ").trim() || "Untitled",
        page: loc?.page ?? null,
        top: loc?.top ?? null,
        children: node.items?.length ? await walk(node.items) : [],
      });
    }
    return out;
  };

  return walk(raw);
}

export function pageListOutline(numPages: number, pageLabel: string): OutlineNode[] {
  if (numPages < 1) return [];
  return Array.from({ length: numPages }, (_, i) => ({
    id: `page-${i + 1}`,
    title: `${pageLabel} ${i + 1}`,
    page: i + 1,
    top: 0,
    children: [],
  }));
}

export function scrollToOutlineTarget(
  scroller: HTMLElement,
  target: OutlineJump,
  padding = 12,
) {
  const el = scroller.querySelector(
    `[data-page-number="${target.page}"]`,
  ) as HTMLElement | null;
  if (!el) return false;
  const pageHeight = el.getBoundingClientRect().height || el.offsetHeight;
  const frac = target.top ?? 0;
  const rootRect = scroller.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const y = scroller.scrollTop + (elRect.top - rootRect.top) + frac * pageHeight - padding;
  scroller.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  return true;
}
