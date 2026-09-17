"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { extractPaperCitation, lookupReference } from "@/lib/citations";
import { t } from "@/lib/i18n";
import {
  deletePaper,
  getPaper,
  listLibrary,
  savePaper,
  updateHighlights,
} from "@/lib/library";
import { clipContext, matchQuoteOnPage, paragraphBlocks } from "@/lib/pdf-text";
import type {
  AiStatus,
  AiTab,
  ChatMessage,
  ExplainResult,
  HighlightColor,
  Locale,
  PageContent,
  PaperCitation,
  PaperHighlight,
  PaperRecord,
  ReferenceItem,
  SelectionState,
  TranslatePair,
} from "@/lib/types";

const SAMPLE_ID = "sample";
const SAMPLE_URL = "/sample-paper.pdf";
const SAMPLE_NAME = "Contextual Memory Attention (sample)";

type OpenPaper = {
  id: string;
  name: string;
  url: string;
  blob?: Blob;
  isSample?: boolean;
  inLibrary: boolean;
};

type AiErrorState = { code?: string; message: string } | null;

type ReaderContextValue = {
  copy: ReturnType<typeof t>;
  locale: Locale;
  setLocale: (l: Locale) => void;
  paper: OpenPaper | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  openFilePicker: () => void;
  openSample: () => void;
  openUploaded: (file: File) => void;
  openFromLibrary: (id: string) => Promise<void>;
  addToLibrary: () => Promise<void>;
  removeFromLibrary: (id: string) => Promise<void>;
  library: PaperRecord[];
  leftMode: "nav" | "library";
  setLeftMode: (m: "nav" | "library") => void;
  leftCollapsed: boolean;
  setLeftCollapsed: (v: boolean) => void;
  numPages: number;
  setNumPages: (n: number) => void;
  page: number;
  setPage: (n: number) => void;
  scale: number;
  setScale: (n: number) => void;
  pages: PageContent[];
  setPages: (p: PageContent[]) => void;
  extracting: boolean;
  setExtracting: (v: boolean) => void;
  highlights: PaperHighlight[];
  selection: SelectionState | null;
  setSelection: (s: SelectionState | null) => void;
  addManualHighlight: (color: HighlightColor, note?: string) => void;
  updateNote: (id: string, note: string) => void;
  removeHighlight: (id: string) => void;
  regionMode: boolean;
  setRegionMode: (v: boolean) => void;
  autoTranslate: boolean;
  setAutoTranslate: (v: boolean) => void;
  tab: AiTab;
  setTab: (t: AiTab) => void;
  status: AiStatus | null;
  busy: string | null;
  aiError: AiErrorState;
  explain: ExplainResult | null;
  translations: TranslatePair[];
  targetLanguage: string;
  setTargetLanguage: (v: string) => void;
  summary: string;
  threeLine: string;
  chat: ChatMessage[];
  citation: PaperCitation | null;
  lookedUp: ReferenceItem | null;
  runExplain: (text?: string, image?: string) => Promise<void>;
  runTranslate: (text?: string) => Promise<void>;
  runSummary: (kind: "threeline" | "keypoints" | "selection") => Promise<void>;
  runChat: (content: string) => Promise<void>;
  runAutoHighlight: () => Promise<void>;
  clearAutoHighlights: () => void;
  runCitation: (text?: string) => Promise<void>;
  continueFromExplain: () => void;
  toast: string | null;
  notify: (message: string) => void;
};

const Ctx = createContext<ReaderContextValue | null>(null);

export function useReader() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useReader outside provider");
  return v;
}

export function ReaderProvider({
  children,
  initialSample,
}: {
  children: React.ReactNode;
  initialSample: boolean;
}) {
  const [locale, setLocale] = useState<Locale>("en");
  const copy = t(locale);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [paper, setPaper] = useState<OpenPaper | null>(null);
  const [library, setLibrary] = useState<PaperRecord[]>([]);
  const [leftMode, setLeftMode] = useState<"nav" | "library">("nav");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [pages, setPages] = useState<PageContent[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [highlights, setHighlights] = useState<PaperHighlight[]>([]);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [regionMode, setRegionMode] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [tab, setTab] = useState<AiTab>("explain");
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [aiError, setAiError] = useState<AiErrorState>(null);
  const [explain, setExplain] = useState<ExplainResult | null>(null);
  const [translations, setTranslations] = useState<TranslatePair[]>([]);
  const [targetLanguage, setTargetLanguage] = useState("Traditional Chinese");
  const [summary, setSummary] = useState("");
  const [threeLine, setThreeLine] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [citationOverride, setCitationOverride] = useState<PaperCitation | null>(null);
  const [lookedUp, setLookedUp] = useState<ReferenceItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const fullText = useMemo(() => pages.map((p) => p.text).join("\n\n"), [pages]);
  const heuristicCitation = useMemo(() => {
    if (!pages.length) return null;
    return extractPaperCitation(fullText, paper?.name);
  }, [fullText, pages.length, paper?.name]);
  const citation = citationOverride ?? heuristicCitation;

  const refreshLibrary = useCallback(async () => {
    try {
      setLibrary(await listLibrary());
    } catch {
      setLibrary([]);
    }
  }, []);

  useEffect(() => {
    void refreshLibrary();
    void fetch("/api/ai/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, model: null }));
  }, [refreshLibrary]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const persistHighlights = useCallback(
    async (id: string, next: PaperHighlight[], inLibrary: boolean) => {
      localStorage.setItem(`thesis-helper-marks:${id}`, JSON.stringify(next));
      if (inLibrary) {
        try {
          await updateHighlights(id, next);
        } catch {
          // ignore
        }
      }
    },
    [],
  );

  const loadHighlights = useCallback((id: string, stored?: PaperHighlight[]) => {
    if (stored?.length) {
      setHighlights(stored);
      return;
    }
    try {
      const raw = localStorage.getItem(`thesis-helper-marks:${id}`);
      setHighlights(raw ? (JSON.parse(raw) as PaperHighlight[]) : []);
    } catch {
      setHighlights([]);
    }
  }, []);

  const resetAi = () => {
    setExplain(null);
    setTranslations([]);
    setSummary("");
    setThreeLine("");
    setChat([]);
    setCitationOverride(null);
    setLookedUp(null);
    setAiError(null);
  };

  const openBlob = useCallback(
    (meta: { id: string; name: string; blob: Blob; isSample?: boolean; inLibrary: boolean }) => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(meta.blob);
      urlRef.current = url;
      setPaper({
        id: meta.id,
        name: meta.name,
        url,
        blob: meta.blob,
        isSample: meta.isSample,
        inLibrary: meta.inLibrary,
      });
      setPage(1);
      setNumPages(0);
      setPages([]);
      resetAi();
    },
    [],
  );

  const persistOpened = useCallback(
    async (
      meta: { id: string; name: string; blob: Blob; isSample?: boolean },
      nextHighlights: PaperHighlight[],
    ) => {
      await savePaper({
        id: meta.id,
        name: meta.name,
        addedAt: Date.now(),
        lastOpened: Date.now(),
        isSample: meta.isSample,
        blob: meta.blob,
        highlights: nextHighlights,
      });
    },
    [],
  );

  const openSample = useCallback(async () => {
    const res = await fetch(SAMPLE_URL);
    const blob = await res.blob();
    const saved = await getPaper(SAMPLE_ID).catch(() => null);
    let marks = saved?.highlights || [];
    if (!marks.length) {
      try {
        const raw = localStorage.getItem(`thesis-helper-marks:${SAMPLE_ID}`);
        marks = raw ? (JSON.parse(raw) as PaperHighlight[]) : [];
      } catch {
        marks = [];
      }
    }
    openBlob({
      id: SAMPLE_ID,
      name: SAMPLE_NAME,
      blob,
      isSample: true,
      inLibrary: true,
    });
    loadHighlights(SAMPLE_ID, marks);
    await persistOpened(
      { id: SAMPLE_ID, name: SAMPLE_NAME, blob, isSample: true },
      marks,
    );
    await refreshLibrary();
  }, [loadHighlights, openBlob, persistOpened, refreshLibrary]);

  const openFromLibrary = useCallback(
    async (id: string) => {
      const row = await getPaper(id);
      if (!row) return;
      openBlob({
        id: row.id,
        name: row.name,
        blob: row.blob,
        isSample: row.isSample,
        inLibrary: true,
      });
      loadHighlights(row.id, row.highlights);
      await savePaper({ ...row, lastOpened: Date.now() });
      await refreshLibrary();
    },
    [loadHighlights, openBlob, refreshLibrary],
  );

  const onFile = useCallback(
    async (file: File) => {
      const id = crypto.randomUUID();
      openBlob({ id, name: file.name, blob: file, inLibrary: true });
      loadHighlights(id);
      await persistOpened({ id, name: file.name, blob: file }, []);
      await refreshLibrary();
      setLeftMode("library");
      setToast(copy.saved);
    },
    [copy.saved, loadHighlights, openBlob, persistOpened, refreshLibrary],
  );

  useEffect(() => {
    if (initialSample) void openSample();
  }, [initialSample, openSample]);

  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) return;
    const handler = () => {
      const file = input.files?.[0];
      if (file) void onFile(file);
      input.value = "";
    };
    input.addEventListener("change", handler);
    return () => input.removeEventListener("change", handler);
  }, [onFile]);

  const openFilePicker = () => fileInputRef.current?.click();

  const addToLibrary = async () => {
    if (!paper?.blob) return;
    await savePaper({
      id: paper.id,
      name: paper.name,
      addedAt: Date.now(),
      lastOpened: Date.now(),
      pageCount: numPages || undefined,
      isSample: paper.isSample,
      blob: paper.blob,
      highlights,
    });
    setPaper({ ...paper, inLibrary: true });
    await refreshLibrary();
    setToast(copy.saved);
  };

  const removeFromLibrary = async (id: string) => {
    await deletePaper(id);
    if (paper?.id === id) setPaper({ ...paper, inLibrary: false });
    await refreshLibrary();
  };

  const addManualHighlight = (color: HighlightColor, note?: string) => {
    if (!selection || !paper) return;
    const pageContent = pages.find((p) => p.pageNumber === selection.page);
    const rects =
      selection.rects?.length
        ? selection.rects
        : pageContent
          ? matchQuoteOnPage(pageContent, selection.text)
          : [];
    const mark: PaperHighlight = {
      id: crypto.randomUUID(),
      page: selection.page,
      text: selection.text,
      color,
      kind: "manual",
      note,
      rects,
      createdAt: Date.now(),
    };
    const next = [...highlights, mark];
    setHighlights(next);
    void persistHighlights(paper.id, next, paper.inLibrary);
    setSelection(null);
    setTab("notes");
  };

  const updateNote = (id: string, note: string) => {
    if (!paper) return;
    const next = highlights.map((h) => (h.id === id ? { ...h, note } : h));
    setHighlights(next);
    void persistHighlights(paper.id, next, paper.inLibrary);
  };

  const removeHighlight = (id: string) => {
    if (!paper) return;
    const next = highlights.filter((h) => h.id !== id);
    setHighlights(next);
    void persistHighlights(paper.id, next, paper.inLibrary);
  };

  const clearAutoHighlights = () => {
    if (!paper) return;
    const next = highlights.filter((h) => h.kind !== "auto");
    setHighlights(next);
    void persistHighlights(paper.id, next, paper.inLibrary);
  };

  const contextForAi = (selectionText?: string) =>
    clipContext(fullText, selectionText) || fullText.slice(0, 14000);

  async function requestAi<T>(payload: Record<string, unknown>): Promise<T> {
    setAiError(null);
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale,
        paperContext: contextForAi(
          typeof payload.selection === "string" ? payload.selection : undefined,
        ),
        paperTitle: paper?.name,
        ...payload,
      }),
    });
    if (payload.stream) {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = { code: data.code, message: data.error || copy.aiError };
        setAiError(err);
        throw Object.assign(new Error(err.message), err);
      }
      return res as T;
    }
    const data = await res.json();
    if (!res.ok) {
      const err = { code: data.code, message: data.error || copy.aiError };
      setAiError(err);
      throw Object.assign(new Error(err.message), err);
    }
    return data as T;
  }

  const runExplain = async (text?: string, image?: string) => {
    const selectionText = text ?? selection?.text;
    setTab("explain");
    if (image) {
      setExplain({
        title: copy.explainFigure,
        body: "",
        selection: selectionText,
        image,
      });
      setRegionMode(false);
      setToast(copy.regionCaptured);
    }
    setBusy("explain");
    try {
      const data = await requestAi<ExplainResult>({
        task: "explain",
        selection: selectionText,
        image,
      });
      setExplain({ ...data, image: image || data.image });
      setSelection(null);
    } catch {
      if (!image) setExplain(null);
    } finally {
      setBusy(null);
    }
  };

  const runTranslate = async (text?: string) => {
    setTab("translate");
    setBusy("translate");
    try {
      const source =
        text ??
        selection?.text ??
        pages.find((p) => p.pageNumber === page)?.text ??
        paragraphBlocks(fullText).join("\n\n");
      const data = await requestAi<{ paragraphs: TranslatePair[] }>({
        task: "translate",
        selection: source,
        targetLanguage,
      });
      setTranslations(data.paragraphs || []);
      setSelection(null);
    } catch {
      setTranslations([]);
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (autoTranslate && pages.length) {
      void runTranslate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTranslate, page, pages.length]);

  const runSummary = async (kind: "threeline" | "keypoints" | "selection") => {
    setTab("summary");
    setBusy("summary");
    try {
      const data = await requestAi<{ text: string }>({
        task: "summarize",
        summaryKind: kind,
        selection: kind === "selection" ? selection?.text : undefined,
      });
      if (kind === "threeline") setThreeLine(data.text);
      else setSummary(data.text);
    } catch {
      /* shown via aiError */
    } finally {
      setBusy(null);
    }
  };

  const runChat = async (content: string) => {
    const user: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
    const next = [...chat, user];
    setChat(next);
    setTab("chat");
    setBusy("chat");
    const assistantId = crypto.randomUUID();
    setChat([...next, { id: assistantId, role: "assistant", content: "" }]);
    try {
      const res = await requestAi<Response>({
        task: "chat",
        stream: true,
        messages: next,
        selection: selection?.text,
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setChat((cur) =>
          cur.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m)),
        );
      }
    } catch {
      setChat((cur) =>
        cur.map((m) =>
          m.id === assistantId && !m.content
            ? { ...m, content: copy.aiError }
            : m,
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const runAutoHighlight = async () => {
    if (status && !status.configured) {
      setAiError({ code: "NO_API_KEY", message: copy.aiMissingBody });
      setToast(copy.autoHighlightNeedsAi);
      return;
    }
    setBusy("highlight");
    try {
      const data = await requestAi<{
        items: { quote: string; category: PaperHighlight["category"]; reason: string }[];
      }>({ task: "highlight" });
      const created: PaperHighlight[] = [];
      for (const item of data.items || []) {
        for (const p of pages) {
          const rects = matchQuoteOnPage(p, item.quote);
          if (!rects.length) continue;
          const color: HighlightColor =
            item.category === "innovation"
              ? "pink"
              : item.category === "method"
                ? "green"
                : "orange";
          created.push({
            id: crypto.randomUUID(),
            page: p.pageNumber,
            text: item.quote,
            color,
            kind: "auto",
            category: item.category,
            reason: item.reason,
            rects,
            createdAt: Date.now(),
          });
          break;
        }
      }
      const next = [...highlights.filter((h) => h.kind !== "auto"), ...created];
      setHighlights(next);
      if (paper) void persistHighlights(paper.id, next, paper.inLibrary);
    } catch {
      /* aiError */
    } finally {
      setBusy(null);
    }
  };

  const runCitation = async (text?: string) => {
    setTab("citation");
    const sel = text ?? selection?.text;
    const local = citation || extractPaperCitation(fullText);
    if (sel) setLookedUp(lookupReference(local, sel));
    setBusy("citation");
    try {
      const data = await requestAi<{ citation: PaperCitation }>({
        task: "citation",
        selection: sel,
      });
      setCitationOverride(data.citation);
      if (sel) setLookedUp(lookupReference(data.citation, sel) || lookupReference(local, sel));
    } catch {
      setCitationOverride(local);
    } finally {
      setBusy(null);
    }
  };

  const continueFromExplain = () => {
    if (!explain) return;
    setTab("chat");
    const seed = `Continuing from this explanation of: "${explain.selection || "the selected passage"}"\n\n${explain.body}\n\nAsk a follow-up, or tell me what is still unclear.`;
    setChat((c) => [
      ...c,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: seed,
      },
    ]);
  };

  const value: ReaderContextValue = {
    copy,
    locale,
    setLocale,
    paper,
    fileInputRef,
    openFilePicker,
    openSample,
    openUploaded: onFile,
    openFromLibrary,
    addToLibrary,
    removeFromLibrary,
    library,
    leftMode,
    setLeftMode,
    leftCollapsed,
    setLeftCollapsed,
    numPages,
    setNumPages,
    page,
    setPage,
    scale,
    setScale,
    pages,
    setPages,
    extracting,
    setExtracting,
    highlights,
    selection,
    setSelection,
    addManualHighlight,
    updateNote,
    removeHighlight,
    regionMode,
    setRegionMode,
    autoTranslate,
    setAutoTranslate,
    tab,
    setTab,
    status,
    busy,
    aiError,
    explain,
    translations,
    targetLanguage,
    setTargetLanguage,
    summary,
    threeLine,
    chat,
    citation,
    lookedUp,
    runExplain,
    runTranslate,
    runSummary,
    runChat,
    runAutoHighlight,
    clearAutoHighlights,
    runCitation,
    continueFromExplain,
    toast,
    notify: setToast,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
