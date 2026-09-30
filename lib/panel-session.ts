import type { AiTab, PaperPanelSession } from "./types";

const TABS: AiTab[] = [
  "explain",
  "translate",
  "chat",
  "summary",
  "citation",
  "notes",
];

export const SAMPLE_PAPER_ID = "sample";
export const LAST_PAPER_KEY = "thesis-helper-last-paper";
export const PANEL_STORAGE_KEY = (id: string) => `thesis-helper-panel:${id}`;
export const MARKS_STORAGE_KEY = (id: string) => `thesis-helper-marks:${id}`;

export function emptyPanel(): PaperPanelSession {
  return {
    tab: "explain",
    explain: null,
    translations: [],
    targetLanguage: "Traditional Chinese",
    summary: "",
    threeLine: "",
    chat: [],
    citation: null,
    lookedUp: null,
    updatedAt: Date.now(),
  };
}

function isAiTab(value: unknown): value is AiTab {
  return typeof value === "string" && (TABS as string[]).includes(value);
}

export function normalizePanel(raw: unknown): PaperPanelSession {
  const base = emptyPanel();
  if (!raw || typeof raw !== "object") return base;
  const panel = raw as Partial<PaperPanelSession>;
  const chat = Array.isArray(panel.chat)
    ? panel.chat.filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          (m.role === "user" || m.content.length > 0),
      )
    : [];
  return {
    tab: isAiTab(panel.tab) ? panel.tab : base.tab,
    explain: panel.explain ?? null,
    translations: Array.isArray(panel.translations) ? panel.translations : [],
    targetLanguage: panel.targetLanguage || base.targetLanguage,
    summary: typeof panel.summary === "string" ? panel.summary : "",
    threeLine: typeof panel.threeLine === "string" ? panel.threeLine : "",
    chat,
    citation: panel.citation ?? null,
    lookedUp: panel.lookedUp ?? null,
    updatedAt: typeof panel.updatedAt === "number" ? panel.updatedAt : Date.now(),
  };
}

/** localStorage / quota fallback: drop large explain-image payloads. */
export function slimPanel(panel: PaperPanelSession): PaperPanelSession {
  return {
    ...panel,
    explain: panel.explain ? { ...panel.explain, image: undefined } : null,
  };
}

export function filePaperId(file: {
  name: string;
  size: number;
  lastModified: number;
}): string {
  return `upload:${encodeURIComponent(file.name)}:${file.size}:${file.lastModified}`;
}

export function hasPanelRecords(panel: PaperPanelSession | null | undefined): boolean {
  if (!panel) return false;
  return Boolean(
    panel.explain?.body ||
      panel.translations.length ||
      panel.chat.length ||
      panel.summary ||
      panel.threeLine ||
      panel.citation ||
      panel.lookedUp,
  );
}
