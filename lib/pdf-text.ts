import type { OverlayRect, PageContent, TextItemBox } from "./types";

export function itemsToText(items: TextItemBox[]) {
  return items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
}

export function matchQuoteOnPage(page: PageContent, quote: string): OverlayRect[] {
  const needle = normalize(quote);
  if (!needle || needle.length < 8) return [];

  const map: (TextItemBox | null)[] = [];
  let hay = "";
  for (const item of page.items) {
    if (!item.str) continue;
    if (hay.length) {
      hay += " ";
      map.push(null);
    }
    for (const ch of item.str) {
      hay += ch;
      map.push(item);
    }
  }
  const hayNorm = normalize(hay);
  // Map from normalized index to original index via walking both
  const origAtNorm = buildNormIndex(hay);
  let startNorm = hayNorm.indexOf(needle);
  if (startNorm < 0) {
    const short = needle.slice(0, Math.min(72, needle.length));
    startNorm = hayNorm.indexOf(short);
  }
  if (startNorm < 0) return [];
  const endNorm = startNorm + Math.min(needle.length, hayNorm.length - startNorm);
  const used = new Set<TextItemBox>();
  for (let n = startNorm; n < endNorm; n++) {
    const orig = origAtNorm[n];
    const item = orig != null ? map[orig] : null;
    if (item) used.add(item);
  }
  return [...used].map((item) => ({
    x: item.x / page.width,
    y: item.y / page.height,
    width: Math.max(item.width, 4) / page.width,
    height: Math.max(item.height, 8) / page.height,
  }));
}

export function paragraphBlocks(text: string): string[] {
  const chunks = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 40);
  if (chunks.length) return chunks.slice(0, 12);
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g) || [text];
  const grouped: string[] = [];
  let buf = "";
  for (const s of sentences) {
    buf += s;
    if (buf.length > 280) {
      grouped.push(buf.trim());
      buf = "";
    }
  }
  if (buf.trim()) grouped.push(buf.trim());
  return grouped.slice(0, 12);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildNormIndex(original: string): number[] {
  const idx: number[] = [];
  let i = 0;
  const lower = original.toLowerCase();
  while (i < lower.length) {
    if (/\s/.test(lower[i])) {
      while (i < lower.length && /\s/.test(lower[i])) i += 1;
      continue;
    }
    idx.push(i);
    i += 1;
  }
  return idx;
}

export function clipContext(fullText: string, selection?: string, maxChars = 14000) {
  if (!selection) return fullText.slice(0, maxChars);
  const idx = fullText.toLowerCase().indexOf(selection.slice(0, 80).toLowerCase());
  if (idx < 0) {
    return `${selection}\n\n---\n\n${fullText.slice(0, maxChars - selection.length - 20)}`;
  }
  const start = Math.max(0, idx - 1800);
  const around = fullText.slice(start, idx + selection.length + 2400);
  const head = fullText.slice(0, 3500);
  const combined = `SELECTION:\n${selection}\n\nLOCAL CONTEXT:\n${around}\n\nDOCUMENT START:\n${head}`;
  return combined.slice(0, maxChars);
}
