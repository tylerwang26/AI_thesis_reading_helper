"use client";

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
  if (!selection || regionMode) return null;

  return (
    <div
      className="fixed z-50 flex -translate-x-1/2 -translate-y-[120%] items-center gap-1 rounded-full border border-violet-100 bg-white px-2 py-1 text-xs shadow-lg"
      style={{ left: selection.clientX, top: selection.clientY }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button className="rounded-full px-2 py-1 hover:bg-violet-50" type="button" onClick={() => void runExplain()}>
        {copy.explain}
      </button>
      <button className="rounded-full px-2 py-1 hover:bg-violet-50" type="button" onClick={() => void runTranslate()}>
        {copy.translate}
      </button>
      <button className="rounded-full px-2 py-1 hover:bg-violet-50" type="button" onClick={() => void runCitation()}>
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
      <button className="px-1 text-violet-400" type="button" onClick={() => setSelection(null)}>
        ×
      </button>
    </div>
  );
}
