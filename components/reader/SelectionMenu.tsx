"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useReader } from "./reader-context";
import { highlightSwatches } from "./AiPanel";

export function SelectionMenu() {
  const {
    copy,
    selection,
    setSelection,
    runExplain,
    runTranslate,
    runCitation,
    addManualHighlight,
    regionMode,
  } = useReader();

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-selection-menu]")) return;
      if (window.getSelection()?.toString().trim()) return;
      setSelection(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [setSelection]);

  if (!selection || regionMode || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-selection-menu
      className="fixed z-[400] flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-full border border-violet-200 bg-white px-2 py-1.5 text-xs shadow-2xl"
      style={{ left: selection.clientX, top: Math.max(12, selection.clientY - 10) }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button className="rounded-full px-2 py-1 font-medium hover:bg-violet-50" type="button" onClick={() => void runExplain()}>
        {copy.explain}
      </button>
      <button className="rounded-full px-2 py-1 font-medium hover:bg-violet-50" type="button" onClick={() => void runTranslate()}>
        {copy.translate}
      </button>
      <button className="rounded-full px-2 py-1 font-medium hover:bg-violet-50" type="button" onClick={() => void runCitation()}>
        {copy.citation}
      </button>
      <span className="mx-1 h-4 w-px bg-violet-200" />
      {highlightSwatches.map((color) => (
        <button
          key={color}
          type="button"
          title={`${copy.highlight} ${color}`}
          className={`h-5 w-5 rounded-full border border-white shadow ${
            color === "yellow"
              ? "bg-yellow-300"
              : color === "green"
                ? "bg-emerald-400"
                : color === "blue"
                  ? "bg-sky-400"
                  : "bg-pink-400"
          }`}
          onClick={() => addManualHighlight(color)}
        />
      ))}
      <button
        className="rounded-full px-2 py-1 font-medium hover:bg-violet-50"
        type="button"
        onClick={() => addManualHighlight("yellow", "")}
      >
        {copy.addNote}
      </button>
      <button className="px-1 text-violet-400" type="button" onClick={() => setSelection(null)}>
        ×
      </button>
    </div>,
    document.body,
  );
}
