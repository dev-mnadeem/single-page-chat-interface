import { describe, expect, it } from "vitest";
import React from "react";
import { nodeToText, readFence, sanitiseHref } from "./markdown";

describe("sanitiseHref", () => {
  it.each(["https://example.com", "http://example.com", "mailto:a@b.co", "#anchor", "/local"])(
    "allows %s",
    (href) => {
      expect(sanitiseHref(href)).toBe(href);
    },
  );

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
  ])("drops %s", (href) => {
    expect(sanitiseHref(href)).toBeUndefined();
  });

  it("drops an empty or missing href", () => {
    expect(sanitiseHref(undefined)).toBeUndefined();
    expect(sanitiseHref("")).toBeUndefined();
  });
});

describe("nodeToText", () => {
  it("flattens nested elements back to their text", () => {
    const tree = React.createElement("span", null, "a", React.createElement("b", null, "bc"));
    expect(nodeToText(tree)).toBe("abc");
  });

  it("ignores null, undefined and booleans", () => {
    expect(nodeToText([null, undefined, false, "x"])).toBe("x");
  });
});

describe("readFence", () => {
  it("reads the language off the code element", () => {
    const code = React.createElement("code", { className: "language-typescript" }, "const a=1");
    expect(readFence(code)).toEqual({ code: "const a=1", language: "typescript" });
  });

  it("returns an empty language for an unlabelled fence", () => {
    const code = React.createElement("code", null, "plain");
    expect(readFence(code)).toEqual({ code: "plain", language: "" });
  });

  it("falls back to the raw node when it is not an element", () => {
    expect(readFence("bare text")).toEqual({ code: "bare text", language: "" });
  });
});
