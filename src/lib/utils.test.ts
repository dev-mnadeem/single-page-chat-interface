import { describe, expect, it } from "vitest";
import { cn, fillPercent, formatFileSize, formatTime } from "./utils";

describe("cn", () => {
  it("merges conflicting Tailwind classes, keeping the last", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b");
  });
});

describe("formatFileSize", () => {
  it.each([
    [0, "0 Bytes"],
    [512, "512 Bytes"],
    [1024, "1 KB"],
    [1536, "1.5 KB"],
    [10 * 1024 * 1024, "10 MB"],
  ])("formats %i as %s", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe("formatTime", () => {
  it("renders a 12-hour clock", () => {
    expect(formatTime(new Date(2024, 4, 1, 14, 5))).toMatch(/02:05 PM/i);
  });
});

describe("fillPercent", () => {
  it.each([
    [0, 0],
    [0.5, 50],
    [1, 100],
  ])("maps %s to %i percent", (value, expected) => {
    expect(fillPercent(value, 0, 1)).toBe(expected);
  });

  it("clamps values outside the range", () => {
    expect(fillPercent(-5, 0, 1)).toBe(0);
    expect(fillPercent(5, 0, 1)).toBe(100);
  });

  it("returns 0 for a degenerate range instead of dividing by zero", () => {
    expect(fillPercent(1, 5, 5)).toBe(0);
  });
});
