import { describe, expect, it } from "vitest";
import type { Message } from "../types";
import { toMarkdown, transcriptFilename } from "./transcript";

function message(partial: Partial<Message> & Pick<Message, "sender" | "content">): Message {
  return {
    id: partial.content,
    timestamp: new Date("2024-05-01T10:00:00Z"),
    status: "complete",
    ...partial,
  };
}

describe("toMarkdown", () => {
  it("emits a heading and both speakers", () => {
    const output = toMarkdown([
      message({ sender: "user", content: "hi" }),
      message({ sender: "assistant", content: "hello" }),
    ]);
    expect(output).toContain("# Chat transcript");
    expect(output).toContain("## You");
    expect(output).toContain("## Assistant");
  });

  it("quotes user text so a leading # does not become a heading", () => {
    const output = toMarkdown([message({ sender: "user", content: "# not a heading" })]);
    expect(output).toContain("> # not a heading");
  });

  it("keeps assistant Markdown verbatim", () => {
    const output = toMarkdown([
      message({ sender: "assistant", content: "```ts\nconst a = 1;\n```" }),
    ]);
    expect(output).toContain("```ts\nconst a = 1;\n```");
  });

  it("notes a stopped turn", () => {
    const output = toMarkdown([
      message({ sender: "assistant", content: "half", status: "cancelled" }),
    ]);
    expect(output).toContain("_(stopped early)_");
  });

  it("notes a failed turn", () => {
    const output = toMarkdown([
      message({ sender: "assistant", content: "boom", status: "error" }),
    ]);
    expect(output).toContain("_(this turn failed)_");
  });

  it("lists attachment names", () => {
    const output = toMarkdown([
      message({
        sender: "user",
        content: "see these",
        attachments: [{ id: "1", name: "spec.pdf", size: 1, type: "application/pdf" }],
      }),
    ]);
    expect(output).toContain("Attached: spec.pdf");
  });

  it("ends with exactly one newline", () => {
    const output = toMarkdown([message({ sender: "user", content: "hi" })]);
    expect(output.endsWith("\n")).toBe(true);
    expect(output.endsWith("\n\n")).toBe(false);
  });

  it("accepts a custom title", () => {
    expect(toMarkdown([], "My chat")).toContain("# My chat");
  });
});

describe("transcriptFilename", () => {
  it("has no characters that a filesystem would reject", () => {
    const name = transcriptFilename(new Date("2024-05-01T10:20:30Z"));
    expect(name).toBe("chat-transcript-2024-05-01-10-20-30.md");
    expect(name).not.toMatch(/[:/\\]/);
  });
});
