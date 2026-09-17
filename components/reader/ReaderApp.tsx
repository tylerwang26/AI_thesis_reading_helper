"use client";

import Link from "next/link";
import {
  ChevronLeft,
  Download,
  FolderOpen,
  Highlighter,
  Languages,
  Library,
  ListTree,
  Maximize2,
  Minus,
  Plus,
  ScanSearch,
  Share2,
  Star,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { AiPanel } from "./AiPanel";
import { OutlinePanel } from "./OutlinePanel";
import { PdfPane } from "./PdfPaneDynamic";
import { SelectionMenu } from "./SelectionMenu";
import { useReader } from "./reader-context";

export function ReaderApp() {
  const {
    copy,
    locale,
    setLocale,
    paper,
    fileInputRef,
    openFilePicker,
    openSample,
    openFromLibrary,
    addToLibrary,
    removeFromLibrary,
    library,
    leftMode,
    setLeftMode,
    leftCollapsed,
    setLeftCollapsed,
    page,
    setPage,
    numPages,
    scale,
    setScale,
    regionMode,
    setRegionMode,
    autoTranslate,
    setAutoTranslate,
    runAutoHighlight,
    clearAutoHighlights,
    busy,
    toast,
    notify,
    highlights,
  } = useReader();

  const download = () => {
    if (!paper) return;
    const a = document.createElement("a");
    a.href = paper.url;
    a.download = paper.name.endsWith(".pdf") ? paper.name : `${paper.name}.pdf`;
    a.click();
    notify(copy.downloaded);
  };

  const share = async () => {
    const url = paper?.isSample
      ? `${window.location.origin}/reader?sample=1`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      notify(copy.copied);
    } catch {
      window.prompt(copy.shareNeedHttps, url);
    }
  };

  const fullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) void el.requestFullscreen();
    else void document.exitFullscreen();
  };

  return (
    <div className="flex h-screen flex-col bg-[#efeafc] text-violet-950">
      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" />
      <header className="flex items-center gap-3 border-b border-violet-200/70 bg-white px-3 py-2">
        <Link href="/" className="flex items-center gap-2 pr-2">
          <Logo className="h-7 w-7" />
          <span className="hidden font-semibold sm:inline">{copy.brand}</span>
        </Link>
        <div className="flex flex-1 flex-wrap items-center gap-1 text-sm">
          <IconBtn title={copy.zoomOut} onClick={() => setScale(Math.max(0.6, scale - 0.1))}>
            <Minus className="h-4 w-4" />
          </IconBtn>
          <span className="min-w-12 text-center text-xs">{Math.round(scale * 100)}%</span>
          <IconBtn title={copy.zoomIn} onClick={() => setScale(Math.min(2.4, scale + 0.1))}>
            <Plus className="h-4 w-4" />
          </IconBtn>
          <label className="ml-2 flex items-center gap-1 text-xs">
            {copy.page}
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={page}
              onChange={(e) => {
                const n = Number(e.target.value);
                setPage(n);
                document
                  .querySelector(`[data-page-number="${n}"]`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="w-12 rounded border border-violet-200 px-1 py-0.5"
            />
            / {numPages || "—"}
          </label>
          <span className="mx-2 hidden h-5 w-px bg-violet-200 sm:inline" />
          <Toggle
            active={busy === "highlight"}
            label={copy.autoHighlight}
            icon={<Highlighter className="h-4 w-4" />}
            onClick={() => void runAutoHighlight()}
          />
          <Toggle
            active={regionMode}
            label={copy.explainImage}
            icon={<ScanSearch className="h-4 w-4" />}
            onClick={() => setRegionMode(!regionMode)}
          />
          <Toggle
            active={autoTranslate}
            label={copy.autoTranslate}
            icon={<Languages className="h-4 w-4" />}
            onClick={() => setAutoTranslate(!autoTranslate)}
          />
          {highlights.some((h) => h.kind === "auto") ? (
            <button type="button" className="text-xs text-violet-600" onClick={clearAutoHighlights}>
              {copy.clearAuto}
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <IconBtn title={copy.share} onClick={() => void share()}>
            <Share2 className="h-4 w-4" />
          </IconBtn>
          <IconBtn title={copy.download} onClick={download}>
            <Download className="h-4 w-4" />
          </IconBtn>
          <IconBtn title={copy.fullscreen} onClick={fullscreen}>
            <Maximize2 className="h-4 w-4" />
          </IconBtn>
          <button
            type="button"
            className="ml-1 rounded-full border border-violet-200 px-2 py-1 text-[11px]"
            onClick={() => setLocale(locale === "en" ? "zh-Hant" : "en")}
          >
            {locale === "en" ? "EN" : "繁中"}
          </button>
        </div>
      </header>

      {regionMode ? (
        <div className="bg-violet-950 px-4 py-1 text-center text-xs text-white">{copy.dragRegion}</div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside
          className={`flex flex-col border-r border-violet-200/80 bg-white transition-all ${
            leftCollapsed ? "w-14" : "w-64"
          }`}
        >
          <button
            type="button"
            className="m-2 inline-flex items-center gap-1 self-end rounded-md p-1 text-violet-500 hover:bg-violet-50"
            onClick={() => setLeftCollapsed(!leftCollapsed)}
          >
            <ChevronLeft className={`h-4 w-4 transition ${leftCollapsed ? "rotate-180" : ""}`} />
          </button>
          <nav className="space-y-1 px-2">
            <NavBtn
              icon={<FolderOpen className="h-4 w-4" />}
              label={copy.open}
              collapsed={leftCollapsed}
              onClick={openFilePicker}
            />
            <NavBtn
              icon={<ListTree className="h-4 w-4" />}
              label={copy.outline}
              collapsed={leftCollapsed}
              active={leftMode === "outline"}
              onClick={() => setLeftMode("outline")}
            />
            <NavBtn
              icon={<Library className="h-4 w-4" />}
              label={copy.library}
              collapsed={leftCollapsed}
              active={leftMode === "library"}
              onClick={() => setLeftMode("library")}
            />
            <NavBtn
              icon={<Star className={`h-4 w-4 ${paper?.inLibrary ? "fill-amber-400 text-amber-500" : ""}`} />}
              label={paper?.inLibrary ? copy.inLibrary : copy.addToLibrary}
              collapsed={leftCollapsed}
              onClick={() => void addToLibrary()}
            />
          </nav>
          {!leftCollapsed && leftMode === "library" ? (
            <div className="mt-3 flex-1 overflow-auto px-2 pb-4">
              <button
                type="button"
                className="mb-2 w-full rounded-lg bg-violet-50 px-2 py-2 text-left text-xs"
                onClick={() => void openSample()}
              >
                {copy.samplePaper}
              </button>
              {library.length === 0 ? (
                <p className="px-1 text-xs text-violet-500">{copy.emptyLibrary}</p>
              ) : (
                <ul className="space-y-1">
                  {library.map((item) => (
                    <li key={item.id} className="rounded-lg px-2 py-2 hover:bg-violet-50">
                      <button
                        type="button"
                        className="block w-full truncate text-left text-sm"
                        onClick={() => void openFromLibrary(item.id)}
                      >
                        {item.name}
                      </button>
                      <button
                        type="button"
                        className="text-[11px] text-red-500"
                        onClick={() => void removeFromLibrary(item.id)}
                      >
                        {copy.remove}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : !leftCollapsed ? (
            <div className="mt-3 min-h-0 flex-1 overflow-auto px-2 pb-4">
              {paper ? (
                <p className="mb-2 truncate px-1 text-[11px] text-violet-400" title={paper.name}>
                  {paper.name}
                </p>
              ) : null}
              <OutlinePanel />
            </div>
          ) : null}
        </aside>

        <main className="min-w-0 flex-1">
          <PdfPane />
        </main>
        <div className="hidden w-[380px] shrink-0 md:block">
          <AiPanel />
        </div>
      </div>
      <div className="md:hidden">
        <AiPanel />
      </div>
      <SelectionMenu />
      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-violet-950 px-4 py-2 text-sm text-white">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-md p-1.5 text-violet-800 hover:bg-violet-50"
    >
      {children}
    </button>
  );
}

function Toggle({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
        active ? "bg-violet-950 text-white" : "text-violet-800 hover:bg-violet-50"
      }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function NavBtn({
  icon,
  label,
  onClick,
  collapsed,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  collapsed: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm ${
        active ? "bg-violet-100" : "hover:bg-violet-50"
      }`}
    >
      {icon}
      {!collapsed ? <span>{label}</span> : null}
    </button>
  );
}
