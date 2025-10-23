import { describe, expect, it } from "vitest";
import { STICK_THRESHOLD_PX, isNearBottom } from "./useStickToBottom";

describe("isNearBottom", () => {
  const viewport = { clientHeight: 500, scrollHeight: 2000 };

  it("is true when scrolled all the way down", () => {
    expect(isNearBottom({ ...viewport, scrollTop: 1500 })).toBe(true);
  });

  it("is true just inside the threshold", () => {
    expect(isNearBottom({ ...viewport, scrollTop: 1500 - STICK_THRESHOLD_PX })).toBe(true);
  });

  it("is false one pixel outside the threshold", () => {
    expect(isNearBottom({ ...viewport, scrollTop: 1500 - STICK_THRESHOLD_PX - 1 })).toBe(false);
  });

  it("is false when the user has scrolled up to read history", () => {
    expect(isNearBottom({ ...viewport, scrollTop: 200 })).toBe(false);
  });

  it("is true when the content is shorter than the viewport", () => {
    expect(isNearBottom({ clientHeight: 500, scrollHeight: 300, scrollTop: 0 })).toBe(true);
  });

  it("accepts a caller-supplied threshold", () => {
    expect(isNearBottom({ ...viewport, scrollTop: 1000 }, 600)).toBe(true);
  });
});
