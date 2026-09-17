"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { pageListOutline } from "@/lib/pdf-outline";
import type { OutlineNode } from "@/lib/types";
import { useReader } from "./reader-context";

export function OutlinePanel() {
  const { copy, paper, outline, outlineReady, numPages, page, goToOutline } = useReader();
  const fallback = useMemo(
    () => pageListOutline(numPages, copy.outlinePagesFallback),
    [copy.outlinePagesFallback, numPages],
  );

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
      {nodes.length === 0 ? null : (
        <ul className="space-y-0.5">
          {nodes.map((node) => (
            <OutlineItem
              key={node.id}
              node={node}
              depth={0}
              currentPage={page}
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
  currentPage,
  onJump,
}: {
  node: OutlineNode;
  depth: number;
  currentPage: number;
  onJump: (item: OutlineNode) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasKids = node.children.length > 0;
  const active = node.page != null && node.page === currentPage;
  const canJump = node.page != null;

  return (
    <li>
      <div
        className={`flex items-start rounded-md ${active ? "bg-violet-100" : "hover:bg-violet-50"}`}
        style={{ paddingLeft: 4 + depth * 10 }}
      >
        {hasKids ? (
          <button
            type="button"
            className="mt-1 shrink-0 rounded p-0.5 text-violet-500 hover:bg-violet-100"
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
          className={`min-w-0 flex-1 py-1 pr-1 text-left text-[13px] leading-4 ${
            canJump ? "text-violet-950" : "cursor-default text-violet-400"
          }`}
        >
          <span className="block truncate">{node.title}</span>
          {node.page != null ? (
            <span className="mt-0.5 block text-[10px] text-violet-400">{node.page}</span>
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
              currentPage={currentPage}
              onJump={onJump}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
