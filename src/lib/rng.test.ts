import { describe, expect, it } from "vitest";
import { createRandom, hashString, mulberry32, pick } from "./rng";

describe("hashString", () => {
  it("is stable for the same input", () => {
    expect(hashString("provider interface")).toBe(hashString("provider interface"));
  });

  it("separates inputs that differ by one character", () => {
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });

  it("stays inside the unsigned 32-bit range", () => {
    for (const input of ["", "a", "a longer sentence with spaces", "éè"]) {
      const hash = hashString(input);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThan(2 ** 32);
    }
  });
});

describe("mulberry32", () => {
  it("replays the same sequence from the same seed", () => {
    const first = mulberry32(12345);
    const second = mulberry32(12345);
    const a = [first(), first(), first()];
    const b = [second(), second(), second()];
    expect(a).toEqual(b);
  });

  it("produces values in [0, 1)", () => {
    const random = mulberry32(7);
    for (let i = 0; i < 500; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("does not get stuck on one value", () => {
    const random = mulberry32(99);
    const seen = new Set(Array.from({ length: 50 }, () => random()));
    expect(seen.size).toBeGreaterThan(40);
  });
});

describe("pick", () => {
  it("always returns a member of the list", () => {
    const random = createRandom("seed");
    const items = ["a", "b", "c"] as const;
    for (let i = 0; i < 100; i += 1) {
      expect(items).toContain(pick(items, random));
    }
  });

  it("refuses an empty list rather than returning undefined", () => {
    expect(() => pick([], mulberry32(1))).toThrow(/empty list/);
  });
});
