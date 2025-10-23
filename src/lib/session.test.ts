import { describe, expect, it, vi } from "vitest";
import type { Message } from "../types";
import {
  SESSION_STORAGE_KEY,
  clearSession,
  deserialiseMessages,
  loadSession,
  saveSession,
  serialiseMessages,
} from "./session";

function message(partial: Partial<Message> = {}): Message {
  return {
    id: "m1",
    sender: "user",
    content: "hello",
    timestamp: new Date("2024-05-01T10:00:00Z"),
    status: "complete",
    ...partial,
  };
}

const LIMIT = 10;

describe("serialise / deserialise", () => {
  it("round-trips a message", () => {
    const [restored] = deserialiseMessages(serialiseMessages([message()], LIMIT));
    expect(restored.content).toBe("hello");
    expect(restored.timestamp).toBeInstanceOf(Date);
  });

  it("drops a message still streaming, which would restore half-written", () => {
    const raw = serialiseMessages([message({ status: "streaming" })], LIMIT);
    expect(deserialiseMessages(raw)).toEqual([]);
  });

  it("keeps only the newest messages up to the limit", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      message({ id: `m${i}`, content: `${i}` }),
    );
    const restored = deserialiseMessages(serialiseMessages(many, 5));
    expect(restored).toHaveLength(5);
    expect(restored[4].content).toBe("19");
  });

  it("skips entries that do not match the schema", () => {
    expect(deserialiseMessages('[{"nonsense":true},null,3]')).toEqual([]);
  });

  it("returns nothing for a payload that is not an array", () => {
    expect(deserialiseMessages('{"not":"an array"}')).toEqual([]);
  });
});

describe("loadSession / saveSession / clearSession", () => {
  it("writes then reads back", () => {
    saveSession([message()], LIMIT, localStorage);
    expect(loadSession(localStorage)[0].content).toBe("hello");
  });

  it("returns an empty conversation when nothing is stored", () => {
    expect(loadSession(localStorage)).toEqual([]);
  });

  it("survives corrupt stored data instead of throwing", () => {
    localStorage.setItem(SESSION_STORAGE_KEY, "{not json");
    expect(loadSession(localStorage)).toEqual([]);
  });

  it("survives a storage that throws, as private browsing does", () => {
    const hostile = {
      getItem: vi.fn(() => {
        throw new Error("SecurityError");
      }),
      setItem: vi.fn(() => {
        throw new Error("QuotaExceededError");
      }),
      removeItem: vi.fn(),
    } as unknown as Storage;

    expect(loadSession(hostile)).toEqual([]);
    expect(() => saveSession([message()], LIMIT, hostile)).not.toThrow();
  });

  it("removes the key on clear", () => {
    saveSession([message()], LIMIT, localStorage);
    clearSession(localStorage);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
