import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_ATTACHMENTS,
  DEFAULT_STREAM_CHUNK_DELAY_MS,
  buildConfig,
  findLeakedSecrets,
} from "./config";

describe("findLeakedSecrets", () => {
  it("flags a model key exposed through a VITE_ variable", () => {
    expect(findLeakedSecrets({ VITE_OPENAI_API_KEY: "sk-live-123" })).toEqual([
      "VITE_OPENAI_API_KEY",
    ]);
  });

  it.each(["VITE_ANTHROPIC_API_KEY", "VITE_SECRET", "VITE_ACCESS_TOKEN", "VITE_DB_PASSWORD"])(
    "flags %s",
    (key) => {
      expect(findLeakedSecrets({ [key]: "value" })).toEqual([key]);
    },
  );

  it("ignores server-side variables, which are never bundled", () => {
    expect(findLeakedSecrets({ OPENAI_API_KEY: "sk-live-123" })).toEqual([]);
  });

  it("ignores a declared-but-empty variable", () => {
    expect(findLeakedSecrets({ VITE_OPENAI_API_KEY: "" })).toEqual([]);
  });

  it("passes the config this project actually ships", () => {
    expect(
      findLeakedSecrets({ VITE_CHAT_PROVIDER: "local", VITE_CHAT_API_BASE_URL: "https://x" }),
    ).toEqual([]);
  });
});

describe("buildConfig", () => {
  it("defaults to the offline provider when nothing is set", () => {
    expect(buildConfig({}).provider).toBe("local");
  });

  it("falls back to local for an unrecognised provider name", () => {
    expect(buildConfig({ VITE_CHAT_PROVIDER: "openai" }).provider).toBe("local");
  });

  it("selects the http provider when asked", () => {
    const config = buildConfig({
      VITE_CHAT_PROVIDER: "http",
      VITE_CHAT_API_BASE_URL: "https://proxy.test",
    });
    expect(config).toMatchObject({ provider: "http", apiBaseUrl: "https://proxy.test" });
  });

  it("ignores a non-numeric or negative override", () => {
    expect(buildConfig({ VITE_STREAM_CHUNK_DELAY_MS: "fast" }).streamChunkDelayMs).toBe(
      DEFAULT_STREAM_CHUNK_DELAY_MS,
    );
    expect(buildConfig({ VITE_MAX_ATTACHMENTS: "-3" }).maxAttachments).toBe(
      DEFAULT_MAX_ATTACHMENTS,
    );
  });

  it("accepts a valid numeric override", () => {
    expect(buildConfig({ VITE_MAX_ATTACHMENTS: "2" }).maxAttachments).toBe(2);
  });
});
