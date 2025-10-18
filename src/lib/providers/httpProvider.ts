import type { ChatDelta, ChatProvider, ChatTurnRequest } from "./types";
import { ProviderError, isAbortError } from "./types";

/**
 * Talks to a **server-side proxy**, not to a model vendor.
 *
 * There is deliberately no `apiKey` option. Anything this file could read from
 * the environment is inlined into the browser bundle by Vite and is therefore
 * public; see `findLeakedSecrets` in `src/config.ts`. The credential belongs to
 * the proxy named by `VITE_CHAT_API_BASE_URL`, which is expected to
 * authenticate the *user* (session cookie, bearer issued to the session) and
 * hold the model key itself.
 *
 * Wire format: `POST {baseUrl}/chat` returning `text/event-stream`, one JSON
 * object per `data:` line with a `delta` string, terminated by `data: [DONE]`.
 * That is the OpenAI-compatible shape most proxies already speak.
 */

const SSE_DONE = "[DONE]";
const ERROR_EXCERPT_CHARS = 80;
const EVENT_SEPARATOR = /\r?\n\r?\n/;

interface SseEvent {
  data: string;
}

/** Parses the `data:` lines out of one SSE event block. */
export function parseSseEvent(block: string): SseEvent | null {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim())
    .join("\n");

  return data === "" ? null : { data };
}

/** Pulls the assistant text out of one decoded `data:` payload. */
export function extractDelta(payload: string): string | null {
  if (payload === SSE_DONE) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch (cause) {
    throw new ProviderError(
      "protocol",
      `Malformed SSE payload: ${payload.slice(0, ERROR_EXCERPT_CHARS)}`,
      {
        cause,
      },
    );
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new ProviderError("protocol", "SSE payload was not an object");
  }

  const record = parsed as Record<string, unknown>;
  if (typeof record.delta === "string") return record.delta;
  if (typeof record.error === "string") {
    throw new ProviderError("protocol", record.error);
  }
  return "";
}

/** Splits a byte stream into complete SSE event blocks. */
export async function* readSseEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let separator = EVENT_SEPARATOR.exec(buffer);
      while (separator) {
        const block = buffer.slice(0, separator.index);
        buffer = buffer.slice(separator.index + separator[0].length);
        const event = parseSseEvent(block);
        if (event) yield event;
        separator = EVENT_SEPARATOR.exec(buffer);
      }
    }

    const tail = parseSseEvent(buffer);
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

export interface HttpProviderOptions {
  baseUrl: string;
  /** Injected so tests do not need a live socket. */
  fetchImpl?: typeof fetch;
}

export function createHttpProvider({ baseUrl, fetchImpl }: HttpProviderOptions): ChatProvider {
  const doFetch = fetchImpl ?? globalThis.fetch;
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat`;

  return {
    id: "http",
    label: "Proxy-backed model",
    offline: false,

    async *stream(request: ChatTurnRequest, signal: AbortSignal): AsyncIterable<ChatDelta> {
      if (baseUrl === "") {
        throw new ProviderError(
          "misconfigured",
          "VITE_CHAT_API_BASE_URL is empty, so the http provider has nowhere to send the turn",
        );
      }

      let response: Response;
      try {
        response = await doFetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          // Lets the proxy authenticate the browser session it already owns.
          credentials: "include",
          signal,
          body: JSON.stringify({
            prompt: request.prompt,
            options: request.options,
            attachments: request.attachments,
            history: request.history.map((message) => ({
              role: message.sender,
              content: message.content,
            })),
          }),
        });
      } catch (cause) {
        if (isAbortError(cause)) throw cause;
        throw new ProviderError("network", `Could not reach ${endpoint}`, { cause });
      }

      if (!response.ok) {
        throw new ProviderError("http", `${endpoint} returned ${response.status}`);
      }
      if (!response.body) {
        throw new ProviderError("protocol", "Response had no body to stream");
      }

      for await (const event of readSseEvents(response.body)) {
        const delta = extractDelta(event.data);
        if (delta === null) return;
        if (delta !== "") yield { text: delta };
      }
    },
  };
}
