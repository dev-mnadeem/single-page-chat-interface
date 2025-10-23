import { describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS } from "../../types";
import type { ChatTurnRequest } from "./types";
import { chunkText, createScriptedProvider } from "./scriptedProvider";

const request: ChatTurnRequest = {
  prompt: "Show me code for a clock",
  history: [],
  options: DEFAULT_OPTIONS,
  attachments: [],
};

async function collect(iterable: AsyncIterable<{ text: string }>): Promise<string> {
  let text = "";
  for await (const delta of iterable) text += delta.text;
  return text;
}

describe("chunkText", () => {
  it("loses nothing: the chunks rejoin to the original", () => {
    const text = "line one\n\n```ts\nconst a = 1;\n```\n\ntrailing  spaces   here";
    expect(chunkText(text).join("")).toBe(text);
  });

  it("preserves newlines, which naive word-splitting destroys", () => {
    expect(chunkText("a\nb\nc", 1).join("")).toBe("a\nb\nc");
  });

  it("returns nothing for empty text", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("produces more than one chunk for a real answer", () => {
    expect(chunkText("one two three four five six seven eight").length).toBeGreaterThan(1);
  });
});

describe("createScriptedProvider", () => {
  it("advertises itself as needing no network", () => {
    const provider = createScriptedProvider({ chunkDelayMs: 0 });
    expect(provider.offline).toBe(true);
    expect(provider.id).toBe("local");
  });

  it("streams an answer that matches the composed text", async () => {
    const provider = createScriptedProvider({ chunkDelayMs: 0 });
    const text = await collect(provider.stream(request, new AbortController().signal));
    expect(text).toContain("```typescript");
    expect(text.length).toBeGreaterThan(100);
  });

  it("is deterministic across two runs", async () => {
    const provider = createScriptedProvider({ chunkDelayMs: 0 });
    const first = await collect(provider.stream(request, new AbortController().signal));
    const second = await collect(provider.stream(request, new AbortController().signal));
    expect(first).toBe(second);
  });

  it("rejects immediately when the signal is already aborted", async () => {
    const provider = createScriptedProvider({ chunkDelayMs: 0 });
    const controller = new AbortController();
    controller.abort();
    await expect(collect(provider.stream(request, controller.signal))).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("stops mid-stream when aborted, and yields nothing after", async () => {
    const provider = createScriptedProvider({ chunkDelayMs: 1 });
    const controller = new AbortController();
    const received: string[] = [];

    await expect(
      (async () => {
        for await (const delta of provider.stream(request, controller.signal)) {
          received.push(delta.text);
          if (received.length === 3) controller.abort();
        }
      })(),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(received).toHaveLength(3);
  });
});
