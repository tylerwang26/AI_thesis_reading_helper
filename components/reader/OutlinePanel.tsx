"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { pageListOutline } from "@/lib/pdf-outline";
import type { OutlineNode } from "@/lib/types";
import { useReader } from "./reader-context";

export function OutlinePanel() {
  const { copy, paper, outline, outlineReady, numPages, goToOutline, activeOutlineId } = useReader();
  const fallback = useMemo(() => pageListOutline(numPages, copy.page), [copy.page, numPages]);

  if (!paper) {
    return <p className="px-1 text-xs leading-5 text-violet-500">{copy.dropHint}</p>;
  }
  if (!outlineReady) {
    return <p className="px-1 text-xs text-violet-500">{copy.loadingOutline}</p>;
  }

  const hasBookmarks = outline.length > 0;
  const nodes = hasBookmarks ? outline : fallback;

  return (
    <div>
      {!hasBookmarks ? (
        <p className="mb-2 px-1 text-xs leading-5 text-violet-500">{copy.emptyOutline}</p>
      ) : null}
      {!hasBookmarks && nodes.length > 0 ? (
        <p className="mb-1 px-1 text-[11px] font-medium text-violet-700">{copy.outlinePagesFallback}</p>
      ) : null}
      {nodes.length === 0 ? null : (
        <ul className="space-y-0.5">
          {nodes.map((node) => (
            <OutlineItem
              key={node.id}
              node={node}
              depth={0}
              activeId={activeOutlineId}
              onJump={goToOutline}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function OutlineItem({
  node,
  depth,
  activeId,
  onJump,
}: {
  node: OutlineNode;
  depth: number;
  activeId: string | null;
  onJump: (item: OutlineNode) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasKids = node.children.length > 0;
  const active = activeId === node.id;
  const canJump = node.page != null;

  return (
    <li>
      <div
        className={`flex items-center rounded-md ${active ? "bg-violet-100" : "hover:bg-violet-50"}`}
        style={{ paddingLeft: 4 + depth * 10 }}
      >
        {hasKids ? (
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-violet-500 hover:bg-violet-100"
            aria-label={open ? "Collapse" : "Expand"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="inline-block w-4 shrink-0" />
        )}
        <button
          type="button"
          title={node.title}
          disabled={!canJump}
          onClick={() => canJump && onJump(node)}
          className={`flex min-w-0 flex-1 items-center gap-1 py-1 pr-1 text-left text-[13px] leading-4 ${
            canJump ? "text-violet-950" : "cursor-default text-violet-400"
          }`}
        >
          <span className="min-w-0 flex-1 truncate">{node.title}</span>
          {node.page != null ? (
            <span className="shrink-0 text-[10px] tabular-nums text-violet-400">{node.page}</span>
          ) : null}
        </button>
      </div>
      {hasKids && open ? (
        <ul>
          {node.children.map((child) => (
            <OutlineItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              onJump={onJump}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
