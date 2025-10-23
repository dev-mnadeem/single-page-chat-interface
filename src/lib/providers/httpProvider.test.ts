import { describe, expect, it, vi } from "vitest";
import { DEFAULT_OPTIONS } from "../../types";
import type { ChatTurnRequest } from "./types";
import { ProviderError } from "./types";
import { createHttpProvider, extractDelta, parseSseEvent } from "./httpProvider";

const request: ChatTurnRequest = {
  prompt: "hello",
  history: [],
  options: DEFAULT_OPTIONS,
  attachments: [],
};

function sseResponse(body: string, init: ResponseInit = {}): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Split mid-event on purpose: the parser has to buffer across reads.
      const encoder = new TextEncoder();
      const half = Math.floor(body.length / 2);
      controller.enqueue(encoder.encode(body.slice(0, half)));
      controller.enqueue(encoder.encode(body.slice(half)));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, ...init });
}

async function collect(iterable: AsyncIterable<{ text: string }>): Promise<string> {
  let text = "";
  for await (const delta of iterable) text += delta.text;
  return text;
}

describe("parseSseEvent", () => {
  it("reads a single data line", () => {
    expect(parseSseEvent("data: {}")).toEqual({ data: "{}" });
  });

  it("joins multi-line data as the spec requires", () => {
    expect(parseSseEvent("data: a\ndata: b")).toEqual({ data: "a\nb" });
  });

  it("ignores comment and event lines", () => {
    expect(parseSseEvent(": keep-alive\nevent: message\ndata: x")).toEqual({ data: "x" });
  });

  it("returns null for a block with no data", () => {
    expect(parseSseEvent(": keep-alive")).toBeNull();
  });
});

describe("extractDelta", () => {
  it("returns the delta text", () => {
    expect(extractDelta('{"delta":"hi"}')).toBe("hi");
  });

  it("signals end of stream with null", () => {
    expect(extractDelta("[DONE]")).toBeNull();
  });

  it("raises a protocol error on malformed JSON", () => {
    expect(() => extractDelta("not json")).toThrow(ProviderError);
  });

  it("raises a protocol error when the proxy reports one", () => {
    expect(() => extractDelta('{"error":"upstream 429"}')).toThrow(/upstream 429/);
  });
});

describe("createHttpProvider", () => {
  it("refuses to run without a base URL", async () => {
    const provider = createHttpProvider({ baseUrl: "" });
    await expect(
      collect(provider.stream(request, new AbortController().signal)),
    ).rejects.toMatchObject({ code: "misconfigured" });
  });

  it("assembles deltas split across chunk boundaries", async () => {
    const body = 'data: {"delta":"Hello "}\n\ndata: {"delta":"world"}\n\ndata: [DONE]\n\n';
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse(body));
    const provider = createHttpProvider({ baseUrl: "https://proxy.test/api", fetchImpl });

    const text = await collect(provider.stream(request, new AbortController().signal));
    expect(text).toBe("Hello world");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://proxy.test/api/chat",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("never puts a credential on the request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse("data: [DONE]\n\n"));
    const provider = createHttpProvider({ baseUrl: "https://proxy.test", fetchImpl });
    await collect(provider.stream(request, new AbortController().signal));

    const headers = fetchImpl.mock.calls[0][1].headers as Record<string, string>;
    expect(Object.keys(headers).map((key) => key.toLowerCase())).not.toContain("authorization");
  });

  it("reports an HTTP failure as an http error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("nope", { status: 502 }));
    const provider = createHttpProvider({ baseUrl: "https://proxy.test", fetchImpl });
    await expect(
      collect(provider.stream(request, new AbortController().signal)),
    ).rejects.toMatchObject({ code: "http" });
  });

  it("reports a transport failure as a network error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const provider = createHttpProvider({ baseUrl: "https://proxy.test", fetchImpl });
    await expect(
      collect(provider.stream(request, new AbortController().signal)),
    ).rejects.toMatchObject({ code: "network" });
  });

  it("stops at [DONE] and ignores anything after it", async () => {
    const body = 'data: {"delta":"a"}\n\ndata: [DONE]\n\ndata: {"delta":"ignored"}\n\n';
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse(body));
    const provider = createHttpProvider({ baseUrl: "https://proxy.test", fetchImpl });
    expect(await collect(provider.stream(request, new AbortController().signal))).toBe("a");
  });

  it("does not double the slash when the base URL has a trailing one", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse("data: [DONE]\n\n"));
    const provider = createHttpProvider({ baseUrl: "https://proxy.test/api/", fetchImpl });
    await collect(provider.stream(request, new AbortController().signal));
    expect(fetchImpl.mock.calls[0][0]).toBe("https://proxy.test/api/chat");
  });
});
