import type { ChatMessage } from "./types";

export class AiConfigError extends Error {
  code = "NO_API_KEY" as const;
  constructor() {
    super("AI is not configured. Set OPENAI_API_KEY.");
    this.name = "AiConfigError";
  }
}

export function getAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = process.env.OPENAI_MODEL?.trim() || process.env.MODEL?.trim() || "gpt-4o-mini";
  return { apiKey, baseUrl, model, configured: Boolean(apiKey) };
}

type OpenAiMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
    };

export async function completeChat(options: {
  messages: OpenAiMessage[];
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const { apiKey, baseUrl, model, configured } = getAiConfig();
  if (!configured || !apiKey) throw new AiConfigError();

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.3,
  };
  if (options.json) body.response_format = { type: "json_object" };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Model request failed (${res.status}): ${errText.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function streamChat(options: {
  messages: OpenAiMessage[];
  temperature?: number;
}): Promise<ReadableStream<Uint8Array>> {
  const { apiKey, baseUrl, model, configured } = getAiConfig();
  if (!configured || !apiKey) throw new AiConfigError();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.4,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const errText = await res.text();
    throw new Error(`Model request failed (${res.status}): ${errText.slice(0, 500)}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let carry = "";

  return new ReadableStream({
    async start(controller) {
      const reader = res.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          carry += decoder.decode(value, { stream: true });
          const lines = carry.split("\n");
          carry = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
              };
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // ignore malformed SSE chunks
            }
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export function toOpenAiHistory(messages: ChatMessage[]): OpenAiMessage[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}
