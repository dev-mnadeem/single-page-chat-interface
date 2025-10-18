import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { AttachmentMeta, ChatOptions, Message } from "../../types";
import type { ChatProvider } from "../providers";
import { ProviderError, createProvider, isAbortError } from "../providers";
import { config } from "../../config";
import type { TurnPhase } from "./turnMachine";
import { chatReducer, initialChatState, isBusy, lastUserPrompt } from "./turnMachine";
import { clearSession, loadSession, saveSession } from "../session";

const ID_RADIX = 36;
const ID_ENTROPY = 1_000_000_000;

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  // Counter-free fallback still has to be collision-proof within a millisecond,
  // which `Date.now()` alone is not - two fast sends produce duplicate React keys.
  const suffix = Math.floor(Math.random() * ID_ENTROPY).toString(ID_RADIX);
  return `${prefix}-${Date.now().toString(ID_RADIX)}-${suffix}`;
}

function describeError(error: unknown): string {
  if (error instanceof ProviderError) {
    switch (error.code) {
      case "network":
        return "Could not reach the chat service. Check the connection and try again.";
      case "http":
        return `The chat service rejected the request (${error.message}).`;
      case "misconfigured":
        return error.message;
      case "protocol":
        return `The chat service sent something unexpected: ${error.message}`;
    }
  }
  return error instanceof Error ? error.message : "The chat turn failed for an unknown reason.";
}

export interface UseChatOptions {
  provider?: ChatProvider;
  persist?: boolean;
}

export interface UseChat {
  messages: Message[];
  phase: TurnPhase;
  busy: boolean;
  providerLabel: string;
  providerOffline: boolean;
  send: (prompt: string, options: ChatOptions, attachments: AttachmentMeta[]) => void;
  cancel: () => void;
  retry: (options: ChatOptions) => void;
  reset: () => void;
}

/**
 * Owns one conversation: the reducer, the provider, and the single
 * `AbortController` that makes a turn interruptible.
 *
 * The controller lives in a ref rather than in state because aborting must not
 * wait for a render, and because a stale controller from a finished turn must
 * never be able to cancel the next one.
 */
export function useChat({ provider, persist = true }: UseChatOptions = {}): UseChat {
  const activeProvider = useMemo(() => provider ?? createProvider(config), [provider]);
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const abortRef = useRef<AbortController | null>(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!persist || restoredRef.current) return;
    restoredRef.current = true;
    const restored = loadSession();
    if (restored.length > 0) dispatch({ type: "restore", messages: restored });
  }, [persist]);

  useEffect(() => {
    if (!persist || !restoredRef.current || isBusy(state.phase)) return;
    saveSession(state.messages, config.persistedMessageLimit);
  }, [persist, state.messages, state.phase]);

  // A component that unmounts mid-turn must not leave a stream running.
  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(
    async (
      prompt: string,
      history: Message[],
      options: ChatOptions,
      attachments: AttachmentMeta[],
    ) => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const stream = activeProvider.stream(
          { prompt, history, options, attachments },
          controller.signal,
        );
        for await (const delta of stream) {
          if (controller.signal.aborted) break;
          dispatch({ type: "delta", text: delta.text });
        }
        if (!controller.signal.aborted) dispatch({ type: "finish" });
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;
        dispatch({ type: "fail", message: describeError(error) });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [activeProvider],
  );

  const send = useCallback(
    (prompt: string, options: ChatOptions, attachments: AttachmentMeta[]) => {
      const trimmed = prompt.trim();
      if (trimmed === "" || isBusy(state.phase)) return;

      dispatch({
        type: "send",
        userMessageId: newId("user"),
        assistantMessageId: newId("assistant"),
        content: trimmed,
        attachments,
        at: new Date(),
      });
      void run(trimmed, state.messages, options, attachments);
    },
    [run, state.messages, state.phase],
  );

  const cancel = useCallback(() => {
    if (!isBusy(state.phase)) return;
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "cancel" });
  }, [state.phase]);

  const retry = useCallback(
    (options: ChatOptions) => {
      const prompt = lastUserPrompt(state);
      if (prompt === null || isBusy(state.phase)) return;

      const lastUserIndex = state.messages.findLastIndex((m) => m.sender === "user");
      const history = state.messages.slice(0, lastUserIndex);
      const attachments = state.messages[lastUserIndex].attachments ?? [];

      dispatch({ type: "dropLastExchange" });
      dispatch({
        type: "send",
        userMessageId: newId("user"),
        assistantMessageId: newId("assistant"),
        content: prompt,
        attachments,
        at: new Date(),
      });
      void run(prompt, history, options, attachments);
    },
    [run, state],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "clear" });
    if (persist) clearSession();
  }, [persist]);

  return {
    messages: state.messages,
    phase: state.phase,
    busy: isBusy(state.phase),
    providerLabel: activeProvider.label,
    providerOffline: activeProvider.offline,
    send,
    cancel,
    retry,
    reset,
  };
}
