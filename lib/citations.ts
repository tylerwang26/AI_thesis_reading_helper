import type { PaperCitation, ReferenceItem } from "./types";

export function extractPaperCitation(fullText: string): PaperCitation {
  const lines = fullText
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const title =
    lines.find(
      (l) =>
        l.length > 20 &&
        !/^abstract$/i.test(l) &&
        !/institute|university|correspondence|arxiv/i.test(l),
    ) || "Untitled paper";

  const authors =
    lines.find((l) => /,\s/.test(l) && / and /i.test(l) && l.length < 200) ||
    lines.find((l) => /^[A-Z][a-z]+\s+[A-Z]\./.test(l)) ||
    "";

  const abstractIdx = lines.findIndex((l) => /^abstract$/i.test(l));
  let abstract = "";
  if (abstractIdx >= 0) {
    abstract = lines.slice(abstractIdx + 1, abstractIdx + 6).join(" ");
  } else {
    const joined = fullText.replace(/\s+/g, " ");
    const m = joined.match(/Abstract[:\s]+(.{120,900}?)(?:\s+1\s+Introduction|\s+1\.\s)/i);
    if (m) abstract = m[1].trim();
  }

  const yearMatch = fullText.match(/\b(20\d{2}|19\d{2})\b/);
  const references = parseReferences(fullText);

  const authorLast = authors.split(/,| and /i)[0]?.trim().split(/\s+/).pop() || "Anon";
  const year = yearMatch?.[1] || "";
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
  const split = fullText.split(/\n?\s*(?:References|Bibliography)\s*\n/i);
  const tail = split.length > 1 ? split.slice(1).join("\n") : "";
  const blob = (tail || fullText).replace(/\r/g, "");

  const numbered = [...blob.matchAll(/\[(\d+)\]\s+([\s\S]*?)(?=\n\s*\[\d+\]\s|$)/g)];
  if (numbered.length >= 2) {
    return numbered.map((m) => decorateRef(m[2], Number(m[1])));
  }

  const dotted = [...blob.matchAll(/(?:^|\n)\s*(\d+)\.\s+([^\n]+(?:\n(?!\s*\d+\.)[^\n]+)*)/g)];
  if (dotted.length >= 2) {
    return dotted.map((m) => decorateRef(m[2], Number(m[1])));
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
