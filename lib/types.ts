export type Locale = "en" | "zh-Hant";

export type AiTask =
  | "explain"
  | "translate"
  | "summarize"
  | "chat"
  | "highlight"
  | "citation";

export type HighlightCategory = "innovation" | "method" | "result" | "other";

export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "orange";

export type OverlayRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PaperHighlight = {
  id: string;
  page: number;
  text: string;
  color: HighlightColor;
  kind: "manual" | "auto";
  category?: HighlightCategory;
  reason?: string;
  note?: string;
  rects: OverlayRect[];
  createdAt: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type AiTab = "explain" | "translate" | "chat" | "summary" | "citation" | "notes";

export type TextItemBox = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PageContent = {
  pageNumber: number;
  text: string;
  items: TextItemBox[];
  width: number;
  height: number;
};

export type PaperRecord = {
  id: string;
  name: string;
  addedAt: number;
  lastOpened: number;
  pageCount?: number;
  isSample?: boolean;
};

export type StoredPaper = PaperRecord & {
  blob: Blob;
  highlights: PaperHighlight[];
};

export type SelectionState = {
  text: string;
  page: number;
  clientX: number;
  clientY: number;
  rects?: OverlayRect[];
};

export type TranslatePair = {
  source: string;
  translation: string;
};

export type PaperCitation = {
  title: string;
  authors: string;
  year?: string;
  venue?: string;
  abstract?: string;
  bibtex?: string;
  references: ReferenceItem[];
};

export type ReferenceItem = {
  id: string;
  index?: number;
  raw: string;
  title?: string;
  authors?: string;
  year?: string;
  venue?: string;
};

export type AiStatus = {
  configured: boolean;
  model: string | null;
};

export type ExplainResult = {
  title: string;
  body: string;
  selection?: string;
  image?: string;
};
