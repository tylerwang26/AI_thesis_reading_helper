import { NextResponse } from "next/server";
import { extractPaperCitation } from "@/lib/citations";
import { AiConfigError, completeChat, streamChat, toOpenAiHistory } from "@/lib/openai";
import { systemPreamble } from "@/lib/prompts";
import type { ChatMessage, Locale } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  task: "explain" | "translate" | "summarize" | "chat" | "highlight" | "citation";
  locale?: Locale;
  paperContext?: string;
  paperTitle?: string;
  selection?: string;
  image?: string;
  targetLanguage?: string;
  summaryKind?: "threeline" | "keypoints" | "selection";
  messages?: ChatMessage[];
  stream?: boolean;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const locale: Locale = body.locale === "zh-Hant" ? "zh-Hant" : "en";
  const context = (body.paperContext || "").slice(0, 18000);
  const selection = body.selection?.trim();

  try {
    if (body.task === "chat" && body.stream) {
      return await handleChatStream(body, locale, context);
    }

    switch (body.task) {
      case "explain":
        return NextResponse.json(await handleExplain(locale, context, selection, body.image));
      case "translate":
        return NextResponse.json(await handleTranslate(locale, context, selection, body.targetLanguage));
      case "summarize":
        return NextResponse.json(await handleSummarize(locale, context, selection, body.summaryKind));
      case "chat":
        return NextResponse.json(await handleChat(body, locale, context));
      case "highlight":
        return NextResponse.json(await handleHighlight(locale, context));
      case "citation":
        return NextResponse.json(await handleCitation(locale, context, selection, body.paperTitle));
      default:
        return NextResponse.json({ error: "Unknown task" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof AiConfigError) {
      return NextResponse.json(
        { error: error.message, code: "NO_API_KEY" },
        { status: 503 },
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, code: "AI_ERROR" }, { status: 502 });
  }
}

async function handleExplain(
  locale: Locale,
  context: string,
  selection?: string,
  image?: string,
) {
  const userText = selection
    ? `Explain the following selection in the context of the paper. Walk through symbols, claims, and why it matters. Then give a short "if you remember one thing" line.\n\nSELECTION:\n${selection}\n\nPAPER CONTEXT:\n${context}`
    : image
      ? `Explain this figure, table, or equation region from the paper. Identify axes, components, and the takeaway. Use the paper context.\n\nPAPER CONTEXT:\n${context}`
      : `Give a concise explanation of the most important idea on the provided pages.\n\nPAPER CONTEXT:\n${context}`;

  const content = image
    ? ([
        { type: "text" as const, text: userText },
        { type: "image_url" as const, image_url: { url: image } },
      ] as const)
    : userText;

  const text = await completeChat({
    messages: [
      { role: "system", content: systemPreamble(locale) },
      { role: "user", content: content as never },
    ],
  });
  return {
    title: selection ? "Explanation" : image ? "Figure explanation" : "Explanation",
    body: text,
    selection: selection || undefined,
  };
}

async function handleTranslate(
  locale: Locale,
  context: string,
  selection?: string,
  targetLanguage?: string,
) {
  const target =
    targetLanguage || (locale === "zh-Hant" ? "Traditional Chinese" : "English");
  const source = selection || context.slice(0, 6000);
  const text = await completeChat({
    json: true,
    messages: [
      { role: "system", content: systemPreamble(locale) },
      {
        role: "user",
        content: `Translate the academic text into ${target}. Preserve meaning, citations like [1], and inline math. Return JSON {"paragraphs":[{"source":"...","translation":"..."}]} with 1-8 paragraph pairs, splitting on natural paragraph boundaries.\n\nTEXT:\n${source}`,
      },
    ],
  });
  return parseJson(text, { paragraphs: [{ source, translation: text }] });
}

async function handleSummarize(
  locale: Locale,
  context: string,
  selection?: string,
  kind?: Body["summaryKind"],
) {
  const mode = kind || (selection ? "selection" : "keypoints");
  const instruction =
    mode === "threeline"
      ? "Write exactly three short bullet points covering problem, method, and result."
      : mode === "selection"
        ? "Summarize the selection in 5-8 sentences, then list 3 takeaways."
        : "Summarize the paper: problem, method, findings, limitations. Use short headings.";
  const text = await completeChat({
    messages: [
      { role: "system", content: systemPreamble(locale) },
      {
        role: "user",
        content: `${instruction}\n\n${selection ? `SELECTION:\n${selection}\n\n` : ""}PAPER:\n${context}`,
      },
    ],
  });
  return { text, kind: mode };
}

async function handleChat(body: Body, locale: Locale, context: string) {
  const history = (body.messages || []).slice(-16);
  const text = await completeChat({
    messages: [
      {
        role: "system",
        content: `${systemPreamble(locale)}\n\nPAPER CONTEXT:\n${context}`,
      },
      ...toOpenAiHistory(history),
    ],
  });
  return { text };
}

async function handleChatStream(body: Body, locale: Locale, context: string) {
  const history = (body.messages || []).slice(-16);
  const stream = await streamChat({
    messages: [
      {
        role: "system",
        content: `${systemPreamble(locale)}\n\nPAPER CONTEXT:\n${context}`,
      },
      ...toOpenAiHistory(history),
    ],
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

async function handleHighlight(locale: Locale, context: string) {
  const text = await completeChat({
    json: true,
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPreamble(locale) },
      {
        role: "user",
        content: `Identify 8-14 key spans to underline for a first-pass reader. Quotes MUST be verbatim substrings from the paper, 12-220 characters, no ellipses.
Return JSON {"items":[{"quote":"...","category":"innovation"|"method"|"result","reason":"..."}]}.
Prefer contribution claims, method names, and quantitative results.

PAPER:\n${context}`,
      },
    ],
  });
  return parseJson(text, { items: [] });
}

async function handleCitation(
  locale: Locale,
  context: string,
  selection?: string,
  paperTitle?: string,
) {
  const heuristic = extractPaperCitation(context);
  if (paperTitle && paperTitle.length > 8) heuristic.title = paperTitle;
  let enhanced = heuristic;
  try {
    const text = await completeChat({
      json: true,
      messages: [
        { role: "system", content: systemPreamble(locale) },
        {
          role: "user",
          content: `Extract citation metadata. Return JSON {"title":"","authors":"","year":"","venue":"","abstract":"","bibtex":"","references":[{"index":1,"raw":"","title":"","authors":"","year":""}]}.
If the user selected a citation marker, put that reference first.
SELECTION:${selection || "(none)"}
PAPER:\n${context.slice(0, 12000)}`,
        },
      ],
    });
    const parsed = parseJson(text, heuristic);
    enhanced = {
      ...heuristic,
      ...parsed,
      references:
        parsed.references?.length > 0 ? parsed.references : heuristic.references,
    };
  } catch {
    enhanced = heuristic;
  }
  return { citation: enhanced, selected: selection || null };
}

function parseJson<T>(text: string, fallback: T): T {
  try {
    const fenced = text.match(/\{[\s\S]*\}/);
    return JSON.parse(fenced ? fenced[0] : text) as T;
  } catch {
    return fallback;
  }
}
