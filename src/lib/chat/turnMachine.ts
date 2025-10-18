import type { AttachmentMeta, Message } from "../../types";

/**
 * The conversation is a state machine, not a pile of booleans.
 *
 * A single `isTyping` flag cannot express "the answer started arriving and then
 * the user stopped it", so a chat built on one has nowhere to put the partial
 * text and no way back if the request throws. Modelling the turn explicitly
 * makes each of those an ordinary, testable transition:
 *
 *   idle --send--> awaiting --delta--> streaming --finish--> idle
 *                     |                    |
 *                     +------ cancel ------+--> idle (partial text kept)
 *                     +------ fail --------+--> idle (error bubble, retryable)
 *
 * `awaiting` and `streaming` are separate because they render differently: the
 * first shows the typing dots, the second shows text with a caret. Collapsing
 * them is what makes a chat UI feel frozen for the first second.
 */
export type TurnPhase = "idle" | "awaiting" | "streaming";

export interface ChatState {
  messages: Message[];
  phase: TurnPhase;
  /** Id of the assistant message currently being written, if any. */
  activeMessageId: string | null;
}

export type ChatAction =
  | { type: "restore"; messages: Message[] }
  | {
      type: "send";
      userMessageId: string;
      assistantMessageId: string;
      content: string;
      attachments: AttachmentMeta[];
      at: Date;
    }
  | { type: "delta"; text: string }
  | { type: "finish" }
  | { type: "cancel" }
  | { type: "fail"; message: string }
  | { type: "dropLastExchange" }
  | { type: "clear" };

export const initialChatState: ChatState = {
  messages: [],
  phase: "idle",
  activeMessageId: null,
};

export function isBusy(phase: TurnPhase): boolean {
  return phase !== "idle";
}

/** Rewrites the in-flight assistant message, leaving the rest untouched. */
function mapActive(state: ChatState, update: (message: Message) => Message): Message[] {
  return state.messages.map((message) =>
    message.id === state.activeMessageId ? update(message) : message,
  );
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "restore":
      return { ...initialChatState, messages: action.messages };

    case "send": {
      if (isBusy(state.phase)) return state;

      const userMessage: Message = {
        id: action.userMessageId,
        sender: "user",
        content: action.content,
        timestamp: action.at,
        status: "complete",
        attachments: action.attachments.length > 0 ? action.attachments : undefined,
      };
      const placeholder: Message = {
        id: action.assistantMessageId,
        sender: "assistant",
        content: "",
        timestamp: action.at,
        status: "streaming",
      };

      return {
        messages: [...state.messages, userMessage, placeholder],
        phase: "awaiting",
        activeMessageId: action.assistantMessageId,
      };
    }

    case "delta": {
      // A delta that arrives after the turn ended belongs to a cancelled
      // request. Dropping it here is what stops a stopped answer from
      // resurrecting itself one chunk later.
      if (!isBusy(state.phase) || state.activeMessageId === null) return state;

      return {
        ...state,
        phase: "streaming",
        messages: mapActive(state, (message) => ({
          ...message,
          content: message.content + action.text,
        })),
      };
    }

    case "finish": {
      if (!isBusy(state.phase)) return state;
      return {
        ...state,
        messages: mapActive(state, (message) => ({ ...message, status: "complete" })),
        phase: "idle",
        activeMessageId: null,
      };
    }

    case "cancel": {
      if (!isBusy(state.phase)) return state;
      const messages = mapActive(state, (message) => ({
        ...message,
        status: "cancelled",
      }));
      return {
        ...state,
        // An answer stopped before it said anything is noise, so it goes.
        messages: messages.filter(
          (message) => message.id !== state.activeMessageId || message.content !== "",
        ),
        phase: "idle",
        activeMessageId: null,
      };
    }

    case "fail": {
      if (!isBusy(state.phase)) return state;
      return {
        ...state,
        messages: mapActive(state, (message) => ({
          ...message,
          status: "error",
          // An empty bubble tells the user nothing, so the reason goes in it.
          content: message.content === "" ? action.message : message.content,
        })),
        phase: "idle",
        activeMessageId: null,
      };
    }

    case "dropLastExchange": {
      if (isBusy(state.phase)) return state;
      const lastUserIndex = state.messages.findLastIndex(
        (message) => message.sender === "user",
      );
      if (lastUserIndex === -1) return state;
      return { ...state, messages: state.messages.slice(0, lastUserIndex) };
    }

    case "clear":
      return initialChatState;
  }
}

/** The prompt a retry would re-send, or null when there is nothing to retry. */
export function lastUserPrompt(state: ChatState): string | null {
  const index = state.messages.findLastIndex((message) => message.sender === "user");
  return index === -1 ? null : state.messages[index].content;
}
