import { describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS } from "../../types";
import { compose, variantWindow } from "./composer";

const base = { prompt: "What is a seam?", options: DEFAULT_OPTIONS, attachments: [] };

describe("variantWindow", () => {
  const pool = ["a", "b", "c", "d"] as const;

  it("collapses to a single variant at temperature 0", () => {
    expect(variantWindow(pool, 0)).toEqual(["a"]);
  });

  it("opens the whole pool at temperature 1", () => {
    expect(variantWindow(pool, 1)).toEqual([...pool]);
  });

  it("clamps out-of-range temperatures instead of slicing oddly", () => {
    expect(variantWindow(pool, -3)).toEqual(["a"]);
    expect(variantWindow(pool, 9)).toEqual([...pool]);
  });

  it("never returns an empty window", () => {
    expect(variantWindow(pool, 0.01).length).toBeGreaterThan(0);
  });
});

describe("compose", () => {
  it("returns identical text for identical input", () => {
    expect(compose({ ...base, style: "definition" })).toBe(
      compose({ ...base, style: "definition" }),
    );
  });

  it("changes the opener when the tone changes", () => {
    const friendly = compose({ ...base, style: "definition" });
    const technical = compose({
      ...base,
      style: "definition",
      options: { ...DEFAULT_OPTIONS, tone: "technical" },
    });
    expect(friendly).not.toBe(technical);
  });

  it("emits a fenced code block for the code style", () => {
    const text = compose({ ...base, style: "code" });
    expect(text).toContain("```typescript");
    expect(text.match(/```/g)?.length).toBe(2);
  });

  it("emits a second fence only at the long length", () => {
    const long = compose({
      ...base,
      style: "code",
      options: { ...DEFAULT_OPTIONS, responseLength: "long" },
    });
    expect(long.match(/```/g)?.length).toBe(4);
  });

  it("grows with response length", () => {
    const short = compose({
      ...base,
      style: "bullets",
      options: { ...DEFAULT_OPTIONS, responseLength: "short" },
    });
    const long = compose({
      ...base,
      style: "bullets",
      options: { ...DEFAULT_OPTIONS, responseLength: "long" },
    });
    expect(long.length).toBeGreaterThan(short.length);
  });

  it("appends the outline only when asked, and only for prose styles", () => {
    const withOutline = compose({
      ...base,
      style: "summary",
      options: { ...DEFAULT_OPTIONS, includeOutline: true },
    });
    const without = compose({ ...base, style: "summary" });
    expect(withOutline).toContain("**Outline**");
    expect(without).not.toContain("**Outline**");

    const codeWithOutline = compose({
      ...base,
      style: "code",
      options: { ...DEFAULT_OPTIONS, includeOutline: true },
    });
    expect(codeWithOutline).not.toContain("**Outline**");
  });

  it("names the attached files", () => {
    const text = compose({
      ...base,
      style: "summary",
      attachments: [{ id: "1", name: "notes.md", size: 10, type: "text/markdown" }],
    });
    expect(text).toContain("notes.md");
    expect(text).toContain("1 attached file");
  });

  it("truncates a very long prompt rather than echoing all of it", () => {
    const prompt = "what is ".repeat(40);
    const text = compose({ ...base, prompt, style: "definition" });
    expect(text).toContain("...");
    expect(text.split("\n")[2].length).toBeLessThan(200);
  });

  it("states plainly that no model was called", () => {
    expect(compose({ ...base, style: "quip" })).toContain("no gpt-4 request was made");
  });
});
