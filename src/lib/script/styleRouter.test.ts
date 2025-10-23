import { describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS } from "../../types";
import { routeStyle } from "./styleRouter";

const options = DEFAULT_OPTIONS;

describe("routeStyle", () => {
  it.each([
    ["How to cancel a fetch", "steps"],
    ["What is a provider interface?", "definition"],
    ["Show me code for a reducer", "code"],
    ["List the trade-offs", "bullets"],
    ["Why does this matter", "qa"],
  ] as const)("routes %s to %s", (prompt, expected) => {
    expect(routeStyle(prompt, options, false)).toBe(expected);
  });

  it("is case insensitive", () => {
    expect(routeStyle("WHAT IS a seam", options, false)).toBe("definition");
  });

  it("prefers the earlier rule when a prompt matches two", () => {
    // "how to" (steps) is listed before "function" (code).
    expect(routeStyle("how to write a function", options, false)).toBe("steps");
  });

  it("lets attachments override every keyword", () => {
    expect(routeStyle("show me code", options, true)).toBe("summary");
  });

  it("falls back on response length when nothing matches", () => {
    expect(routeStyle("hello there", { ...options, responseLength: "short" }, false)).toBe(
      "quip",
    );
    expect(routeStyle("hello there", { ...options, responseLength: "long" }, false)).toBe(
      "summary",
    );
  });
});
