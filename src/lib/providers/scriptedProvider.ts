import type { ChatDelta, ChatProvider, ChatTurnRequest } from "./types";
import { abortableDelay, createAbortError } from "./types";
import { compose } from "../script/composer";
import { routeStyle } from "../script/styleRouter";
import { DEFAULT_STREAM_CHUNK_DELAY_MS } from "../../config";

/** Roughly how many whitespace-separated tokens ride in one delta. */
export const TOKENS_PER_CHUNK = 4;

/**
 * Splits text into streamable chunks without losing a single character.
 *
 * `chunkText(t).join("") === t` is an invariant the tests pin, because the
 * cheap version of this (splitting on spaces and re-joining with a space)
 * quietly destroys the newlines that Markdown code fences depend on.
 */
export function chunkText(text: string, tokensPerChunk = TOKENS_PER_CHUNK): string[] {
  if (text === "") return [];

  const tokens = text.split(/(\s+)/).filter((token) => token !== "");
  const chunks: string[] = [];

  for (let i = 0; i < tokens.length; i += tokensPerChunk) {
    chunks.push(tokens.slice(i, i + tokensPerChunk).join(""));
  }
  return chunks;
}

export interface ScriptedProviderOptions {
  /** Pause between deltas. Tests pass 0 so they do not sit on a timer. */
  chunkDelayMs?: number;
}

/**
 * The default backend: a scripted assistant that runs entirely in the tab.
 *
 * It exists so the project has no "works on my machine with a key" state. The
 * README's screenshots, the test suite and a first-time `npm run dev` all
 * exercise this provider, and all three see identical text because
 * `compose` is seeded rather than random.
 */
export function createScriptedProvider(
  providerOptions: ScriptedProviderOptions = {},
): ChatProvider {
  const chunkDelayMs = providerOptions.chunkDelayMs ?? DEFAULT_STREAM_CHUNK_DELAY_MS;

  return {
    id: "local",
    label: "Local scripted assistant",
    offline: true,

    async *stream(request: ChatTurnRequest, signal: AbortSignal): AsyncIterable<ChatDelta> {
      if (signal.aborted) throw createAbortError();

      const style = routeStyle(request.prompt, request.options, request.attachments.length > 0);
      const text = compose({
        prompt: request.prompt,
        style,
        options: request.options,
        attachments: request.attachments,
      });

      for (const chunk of chunkText(text)) {
        await abortableDelay(chunkDelayMs, signal);
        yield { text: chunk };
      }
    },
  };
}
