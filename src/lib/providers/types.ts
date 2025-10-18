import type { AttachmentMeta, ChatOptions, Message } from "../../types";

/** One turn's worth of input, independent of which backend answers it. */
export interface ChatTurnRequest {
  prompt: string;
  /** Everything said before this turn, oldest first. */
  history: readonly Message[];
  options: ChatOptions;
  attachments: readonly AttachmentMeta[];
}

/** An incremental piece of the answer. */
export interface ChatDelta {
  text: string;
}

/**
 * The port every backend implements.
 *
 * `stream` is an async iterable rather than a promise of a whole string so the
 * UI never has to wait for a complete answer, and so cancellation has
 * something to interrupt. Implementations must reject with `AbortError` when
 * `signal` fires, and must not yield after that point.
 */
export interface ChatProvider {
  readonly id: string;
  readonly label: string;
  /** True when the provider needs no network and no credentials. */
  readonly offline: boolean;
  stream(request: ChatTurnRequest, signal: AbortSignal): AsyncIterable<ChatDelta>;
}

export type ProviderErrorCode = "network" | "http" | "protocol" | "misconfigured";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;

  constructor(code: ProviderErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProviderError";
    this.code = code;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function createAbortError(): Error {
  const error = new Error("The chat turn was cancelled");
  error.name = "AbortError";
  return error;
}

/** A `setTimeout` that rejects with `AbortError` instead of outliving the turn. */
export function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(createAbortError());
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(createAbortError());
    }

    signal.addEventListener("abort", onAbort, { once: true });
  });
}
