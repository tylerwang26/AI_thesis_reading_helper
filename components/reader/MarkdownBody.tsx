"use client";

import type { ReactNode } from "react";
import { parseMarkdownBlocks, type MarkdownBlock } from "@/lib/markdown-blocks";

export function MarkdownBody({
  text,
  tone = "light",
}: {
  text: string;
  tone?: "light" | "dark";
}) {
  if (!text) return null;
  const blocks = parseMarkdownBlocks(text);
  return (
    <div className={`md-body md-body-${tone}`}>
      {blocks.map((block, i) => (
        <MarkdownBlockView key={i} block={block} />
      ))}
    </div>
  );
}

function MarkdownBlockView({ block }: { block: MarkdownBlock }) {
  switch (block.type) {
    case "heading": {
      const Tag = (`h${block.level}` as "h1" | "h2" | "h3" | "h4");
      return <Tag>{renderInline(block.text)}</Tag>;
    }
    case "p":
      return <p>{renderInline(block.text)}</p>;
    case "ul":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol>
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    case "quote":
      return <blockquote>{renderInline(block.text)}</blockquote>;
    case "code":
      return (
        <pre>
          <code>{block.text}</code>
        </pre>
      );
    case "hr":
      return <hr />;
    case "table":
      return (
        <div className="md-table-wrap">
          <table>
            <thead>
              <tr>
                {block.headers.map((cell, i) => (
                  <th key={i}>{renderInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

function renderInline(text: string): ReactNode {
  const re =
    /`([^`]+)`|\*\*([\s\S]+?)\*\*|__([^_]+?)__|(?<!\*)\*([^*\n]+?)\*(?!\*)|\[([^\]]+)\]\((https?:[^)\s]+)\)|~~([^~]+)~~/g;
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let n = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[1] != null) {
      out.push(<code key={n++}>{match[1]}</code>);
    } else if (match[2] != null) {
      out.push(<strong key={n++}>{match[2]}</strong>);
    } else if (match[3] != null) {
      out.push(<strong key={n++}>{match[3]}</strong>);
    } else if (match[4] != null) {
      out.push(<em key={n++}>{match[4]}</em>);
    } else if (match[5] != null && match[6] != null) {
      out.push(
        <a key={n++} href={match[6]} target="_blank" rel="noreferrer noopener">
          {match[5]}
        </a>,
      );
    } else if (match[7] != null) {
      out.push(<del key={n++}>{match[7]}</del>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 1 ? out[0] : out;
}
