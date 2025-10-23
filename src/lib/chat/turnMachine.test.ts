import { describe, expect, it } from "vitest";
import type { ChatState } from "./turnMachine";
import { chatReducer, initialChatState, isBusy, lastUserPrompt } from "./turnMachine";

const sendAction = {
  type: "send" as const,
  userMessageId: "u1",
  assistantMessageId: "a1",
  content: "hello",
  attachments: [],
  at: new Date("2024-05-01T10:00:00Z"),
};

function afterSend(): ChatState {
  return chatReducer(initialChatState, sendAction);
}

describe("chatReducer", () => {
  it("starts idle and empty", () => {
    expect(initialChatState.phase).toBe("idle");
    expect(initialChatState.messages).toEqual([]);
  });

  it("appends the user message and an empty assistant placeholder on send", () => {
    const state = afterSend();
    expect(state.phase).toBe("awaiting");
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0]).toMatchObject({ sender: "user", content: "hello" });
    expect(state.messages[1]).toMatchObject({
      sender: "assistant",
      content: "",
      status: "streaming",
    });
    expect(state.activeMessageId).toBe("a1");
  });

  it("refuses a second send while a turn is in flight", () => {
    const state = afterSend();
    const again = chatReducer(state, { ...sendAction, userMessageId: "u2" });
    expect(again).toBe(state);
  });

  it("moves to streaming on the first delta and accumulates text", () => {
    let state = afterSend();
    state = chatReducer(state, { type: "delta", text: "Hel" });
    expect(state.phase).toBe("streaming");
    state = chatReducer(state, { type: "delta", text: "lo!" });
    expect(state.messages[1].content).toBe("Hello!");
  });

  it("ignores a delta that arrives when no turn is active", () => {
    const state = chatReducer(initialChatState, { type: "delta", text: "ghost" });
    expect(state).toBe(initialChatState);
  });

  it("ignores a late delta after the turn was cancelled", () => {
    let state = afterSend();
    state = chatReducer(state, { type: "delta", text: "partial" });
    state = chatReducer(state, { type: "cancel" });
    const late = chatReducer(state, { type: "delta", text: " more" });
    expect(late).toBe(state);
    expect(state.messages[1].content).toBe("partial");
  });

  it("marks the message complete and returns to idle on finish", () => {
    let state = afterSend();
    state = chatReducer(state, { type: "delta", text: "done" });
    state = chatReducer(state, { type: "finish" });
    expect(state.phase).toBe("idle");
    expect(state.activeMessageId).toBeNull();
    expect(state.messages[1].status).toBe("complete");
  });

  it("keeps the partial text when a streaming turn is cancelled", () => {
    let state = afterSend();
    state = chatReducer(state, { type: "delta", text: "half an ans" });
    state = chatReducer(state, { type: "cancel" });
    expect(state.messages).toHaveLength(2);
    expect(state.messages[1]).toMatchObject({ content: "half an ans", status: "cancelled" });
    expect(state.phase).toBe("idle");
  });

  it("drops an empty placeholder when cancelled before any text arrived", () => {
    const state = chatReducer(afterSend(), { type: "cancel" });
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].sender).toBe("user");
  });

  it("puts the reason in the bubble when a turn fails before any text", () => {
    const state = chatReducer(afterSend(), { type: "fail", message: "proxy is down" });
    expect(state.messages[1]).toMatchObject({ status: "error", content: "proxy is down" });
    expect(state.phase).toBe("idle");
    expect(state.activeMessageId).toBeNull();
  });

  it("keeps partial text when a turn fails mid-stream", () => {
    let state = afterSend();
    state = chatReducer(state, { type: "delta", text: "so far" });
    state = chatReducer(state, { type: "fail", message: "connection reset" });
    expect(state.messages[1].content).toBe("so far");
    expect(state.messages[1].status).toBe("error");
  });

  it("accepts a fresh send after a failure", () => {
    let state = chatReducer(afterSend(), { type: "fail", message: "boom" });
    state = chatReducer(state, {
      ...sendAction,
      userMessageId: "u2",
      assistantMessageId: "a2",
    });
    expect(state.phase).toBe("awaiting");
    expect(state.messages).toHaveLength(4);
  });

  it("drops the last exchange so a retry can replace it", () => {
    let state = chatReducer(afterSend(), { type: "delta", text: "first try" });
    state = chatReducer(state, { type: "finish" });
    state = chatReducer(state, { type: "dropLastExchange" });
    expect(state.messages).toHaveLength(0);
  });

  it("will not drop an exchange mid-turn", () => {
    const state = afterSend();
    expect(chatReducer(state, { type: "dropLastExchange" })).toBe(state);
  });

  it("clears everything on reset", () => {
    const state = chatReducer(afterSend(), { type: "clear" });
    expect(state).toEqual(initialChatState);
  });

  it("restores a saved transcript into an idle state", () => {
    const messages = [
      {
        id: "m1",
        sender: "user" as const,
        content: "saved",
        timestamp: new Date(),
        status: "complete" as const,
      },
    ];
    const state = chatReducer(initialChatState, { type: "restore", messages });
    expect(state.messages).toEqual(messages);
    expect(state.phase).toBe("idle");
  });
});

describe("isBusy", () => {
  it.each([
    ["idle", false],
    ["awaiting", true],
    ["streaming", true],
  ] as const)("%s -> %s", (phase, expected) => {
    expect(isBusy(phase)).toBe(expected);
  });
});

describe("lastUserPrompt", () => {
  it("returns null with nothing to retry", () => {
    expect(lastUserPrompt(initialChatState)).toBeNull();
  });

  it("finds the most recent user message, not the most recent message", () => {
    let state = afterSend();
    state = chatReducer(state, { type: "delta", text: "an answer" });
    state = chatReducer(state, { type: "finish" });
    expect(lastUserPrompt(state)).toBe("hello");
  });
});
