"use client";

import { FormEvent, useState } from "react";
import {
  Highlighter,
  Languages,
  MessageSquareText,
  Quote,
  Sparkles,
  StickyNote,
  WandSparkles,
} from "lucide-react";
import { useReader } from "./reader-context";
import type { AiTab, HighlightColor } from "@/lib/types";

export function AiPanel() {
  const {
    copy,
    tab,
    setTab,
    status,
    aiError,
    busy,
    explain,
    translations,
    summary,
    threeLine,
    chat,
    citation,
    lookedUp,
    highlights,
    runSummary,
    runChat,
    continueFromExplain,
    targetLanguage,
    setTargetLanguage,
    updateNote,
    removeHighlight,
    extracting,
  } = useReader();
  const [draft, setDraft] = useState("");

  const tabs: { id: AiTab; icon: React.ReactNode; label: string }[] = [
    { id: "explain", icon: <Sparkles className="h-4 w-4" />, label: copy.explain },
    { id: "translate", icon: <Languages className="h-4 w-4" />, label: copy.translate },
    { id: "chat", icon: <MessageSquareText className="h-4 w-4" />, label: copy.chat },
    { id: "summary", icon: <WandSparkles className="h-4 w-4" />, label: copy.summary },
    { id: "citation", icon: <Quote className="h-4 w-4" />, label: copy.citation },
    { id: "notes", icon: <StickyNote className="h-4 w-4" />, label: copy.notes },
  ];

  const onChat = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void runChat(text);
  };

  return (
    <aside className="flex h-full min-w-[300px] flex-col border-l border-violet-100 bg-white">
      <div className="flex gap-1 overflow-x-auto border-b border-violet-100 px-2 py-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs ${
              tab === item.id
                ? "bg-violet-950 text-white"
                : "text-violet-800 hover:bg-violet-50"
            }`}
          >
            {item.icon}
            <span className="hidden xl:inline">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-auto p-4">
        {status && !status.configured ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-semibold">{copy.aiMissingTitle}</p>
            <p className="mt-1 text-amber-900/80">{copy.aiMissingBody}</p>
          </div>
        ) : null}
        {aiError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            {aiError.code === "NO_API_KEY" ? copy.aiMissingBody : aiError.message}
          </div>
        ) : null}
        {extracting ? (
          <p className="text-xs text-violet-500">{copy.extracting}</p>
        ) : null}

        {tab === "explain" ? (
          <section>
            <h3 className="mb-2 font-medium text-violet-950">{copy.explainFigure}</h3>
            {busy === "explain" ? (
              <Skeleton />
            ) : explain ? (
              <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                {explain.selection ? (
                  <p className="mb-2 text-xs italic text-violet-700">“{explain.selection}”</p>
                ) : null}
                <Formatted text={explain.body} />
                <button
                  type="button"
                  className="mt-3 text-xs font-medium text-violet-800 underline"
                  onClick={continueFromExplain}
                >
                  {copy.continueChat}
                </button>
              </div>
            ) : (
              <p className="text-sm text-violet-800/70">{copy.noSelection}</p>
            )}
          </section>
        ) : null}

        {tab === "translate" ? (
          <section className="space-y-3">
            <label className="block text-xs text-violet-700">
              {copy.targetLanguage}
              <select
                className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
              >
                <option>Traditional Chinese</option>
                <option>English</option>
                <option>Japanese</option>
                <option>Korean</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </label>
            {busy === "translate" ? (
              <Skeleton />
            ) : translations.length ? (
              translations.map((p, i) => (
                <div key={i} className="rounded-2xl border border-violet-100 p-3">
                  <p className="text-xs text-violet-500">{p.source}</p>
                  <p className="mt-2 text-sm text-violet-950">{p.translation}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-violet-800/70">{copy.noSelection}</p>
            )}
          </section>
        ) : null}

        {tab === "chat" ? (
          <section className="flex min-h-[50vh] flex-col">
            <div className="flex-1 space-y-3">
              {chat.length === 0 ? (
                <p className="text-sm text-violet-800/70">{copy.featChatBody}</p>
              ) : (
                chat.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "ml-6 bg-violet-950 text-white"
                        : "mr-4 bg-violet-50 text-violet-950"
                    }`}
                  >
                    <Formatted text={m.content || (busy === "chat" ? "…" : "")} />
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}

        {tab === "summary" ? (
          <section className="space-y-4">
            <details open className="rounded-2xl border border-violet-100 p-3">
              <summary className="cursor-pointer font-medium text-violet-950">
                {copy.threeLine}
              </summary>
              <div className="mt-2">
                {busy === "summary" && !threeLine ? <Skeleton /> : <Formatted text={threeLine} />}
                <button
                  type="button"
                  className="mt-2 text-xs text-violet-700 underline"
                  onClick={() => void runSummary("threeline")}
                >
                  {copy.threeLine}
                </button>
              </div>
            </details>
            <div>
              {summary ? <Formatted text={summary} /> : null}
              <div className="mt-2 flex gap-2 text-xs">
                <button className="underline" type="button" onClick={() => void runSummary("keypoints")}>
                  {copy.wholePaper}
                </button>
                <button className="underline" type="button" onClick={() => void runSummary("selection")}>
                  {copy.selection}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "citation" ? (
          <section className="space-y-4">
            {lookedUp ? (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                <p className="text-xs font-semibold uppercase text-violet-500">[{lookedUp.index}]</p>
                <p className="mt-1 text-sm">{lookedUp.raw}</p>
              </div>
            ) : null}
            {citation ? (
              <div className="rounded-2xl border border-violet-100 p-3">
                <p className="text-xs uppercase text-violet-500">{copy.paperCitation}</p>
                <h4 className="mt-1 font-semibold">{citation.title}</h4>
                <p className="text-sm text-violet-800">{citation.authors}</p>
                <p className="text-xs text-violet-500">
                  {[citation.venue, citation.year].filter(Boolean).join(" · ")}
                </p>
                {citation.abstract ? (
                  <p className="mt-2 text-sm leading-6 text-violet-900/80">{citation.abstract}</p>
                ) : null}
                {citation.bibtex ? (
                  <pre className="mt-3 overflow-auto rounded-xl bg-violet-950 p-3 text-[11px] text-violet-100">
                    {citation.bibtex}
                  </pre>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-violet-800/70">{copy.noRefs}</p>
            )}
            <div>
              <h4 className="mb-2 text-sm font-medium">{copy.references}</h4>
              <ul className="space-y-2">
                {(citation?.references || []).map((ref) => (
                  <li key={ref.id} className="rounded-xl bg-violet-50 px-3 py-2 text-xs leading-5">
                    [{ref.index}] {ref.raw}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {tab === "notes" ? (
          <section className="space-y-3">
            {highlights.length === 0 ? (
              <p className="text-sm text-violet-800/70">{copy.featMarkupBody}</p>
            ) : (
              highlights.map((h) => (
                <article key={h.id} className="rounded-2xl border border-violet-100 p-3">
                  <div className="flex items-center gap-2 text-xs text-violet-500">
                    <Highlighter className="h-3 w-3" />
                    p.{h.page} · {h.kind}
                    {h.category ? ` · ${h.category}` : ""}
                  </div>
                  <p className="mt-1 text-sm">“{h.text}”</p>
                  <textarea
                    className="mt-2 w-full rounded-lg border border-violet-100 p-2 text-sm"
                    placeholder={copy.notePlaceholder}
                    value={h.note || ""}
                    onChange={(e) => updateNote(h.id, e.target.value)}
                  />
                  <button
                    type="button"
                    className="mt-1 text-xs text-red-600"
                    onClick={() => removeHighlight(h.id)}
                  >
                    {copy.deleteHighlight}
                  </button>
                </article>
              ))
            )}
          </section>
        ) : null}
      </div>

      <form onSubmit={onChat} className="border-t border-violet-100 p-3">
        <div className="flex items-center gap-2 rounded-full bg-violet-50 px-3 py-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={copy.askAnything}
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-violet-950 px-3 py-1 text-xs text-white"
            disabled={busy === "chat"}
          >
            ↑
          </button>
        </div>
      </form>
    </aside>
  );
}

function Formatted({ text }: { text: string }) {
  if (!text) return null;
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2 text-sm leading-6 text-violet-950">
      {blocks.map((block, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {block}
        </p>
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 rounded-full bg-gradient-to-r from-sky-200 to-violet-300" />
      <div className="h-3 w-5/6 rounded-full bg-gradient-to-r from-sky-200 to-violet-300" />
      <div className="h-3 w-2/3 rounded-full bg-gradient-to-r from-sky-200 to-violet-300" />
    </div>
  );
}

export const highlightSwatches: HighlightColor[] = ["yellow", "green", "blue", "pink"];
