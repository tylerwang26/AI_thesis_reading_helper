import type { PaperCitation, ReferenceItem } from "./types";

export function extractPaperCitation(fullText: string, fallbackTitle?: string): PaperCitation {
  const joined = fullText.replace(/\s+/g, " ").trim();

  const authorsMatch = joined.match(
    /((?:[A-Z]\.\s+[A-Z][a-z]+,\s*)+[A-Z]\.\s+[A-Z][a-z]+,\s+and\s+[A-Z]\.\s+[A-Z][a-z]+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3},\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s+and\s+[A-Z][a-z]+)/,
  );
  const authors = authorsMatch?.[1] || "";

  let title = "";
  if (authors) {
    const idx = joined.indexOf(authors);
    const before = joined.slice(0, idx).trim();
    if (before.length >= 12 && before.length <= 240) title = before;
  }
  if (!title) {
    const untilAbstract = joined.split(/\bAbstract\b/i)[0]?.trim() || "";
    if (untilAbstract.length >= 12 && untilAbstract.length <= 240) title = untilAbstract;
  }
  if (!title) title = fallbackTitle || "Untitled paper";

  let abstract = "";
  const abstractMatch = joined.match(
    /\bAbstract\b[:\s]+(.{80,1400}?)(?:\s+\d+\s+Introduction|\s+1\s+Introduction|\s+Keywords\b)/i,
  );
  if (abstractMatch) abstract = abstractMatch[1].trim();

  const yearMatch = joined.match(/\b(20\d{2}|19\d{2})\b/);
  const references = parseReferences(fullText);
  const year = yearMatch?.[1] || "";
  const authorLast = authors.split(/,| and /i)[0]?.trim().split(/\s+/).pop() || "Anon";
  const bibtex = `@article{${slug(authorLast)}${year},
  title={${title}},
  author={${authors || "Unknown"}},
  year={${year}}
}`;

  return {
    title,
    authors,
    year,
    abstract: abstract.slice(0, 1200),
    bibtex,
    references,
  };
}

export function parseReferences(fullText: string): ReferenceItem[] {
  const joined = fullText.replace(/\s+/g, " ");
  const split = joined.split(/\b(?:References|Bibliography)\b/i);
  const blob = split.length > 1 ? split.slice(1).join(" ") : joined;

  const numbered = [...blob.matchAll(/\[(\d+)\]\s+(.+?)(?=\s*\[\d+\]\s|$)/g)];
  if (numbered.length >= 2) {
    return numbered.map((m) => decorateRef(m[2], Number(m[1])));
  }
  return [];
}

export function lookupReference(citation: PaperCitation, selection: string): ReferenceItem | null {
  const nums = [...selection.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  if (nums.length) {
    const found = citation.references.find((r) => r.index === nums[0]);
    if (found) return found;
  }
  const year = selection.match(/\b(19|20)\d{2}\b/)?.[0];
  const name = selection.match(/[A-Z][a-z]+/)?.[0];
  if (name) {
    const found = citation.references.find(
      (r) =>
        r.raw.toLowerCase().includes(name.toLowerCase()) &&
        (!year || r.raw.includes(year)),
    );
    if (found) return found;
  }
  return null;
}

function decorateRef(raw: string, index: number): ReferenceItem {
  const clean = raw.replace(/\s+/g, " ").trim();
  const year = clean.match(/\b(19|20)\d{2}\b/)?.[0];
  const titleMatch = clean.match(/([A-Z][^.]{12,180}\.)/);
  return {
    id: `ref-${index}`,
    index,
    raw: clean,
    year,
    title: titleMatch?.[1]?.replace(/\.$/, ""),
    authors: clean.split(/\. In |\. arXiv|\. \d{4}/)[0],
  };
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "paper";
}
