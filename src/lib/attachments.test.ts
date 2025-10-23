import { describe, expect, it } from "vitest";
import type { Attachment, AttachmentMeta } from "../types";
import type { FileLike } from "./attachments";
import { intakeFiles, toMeta } from "./attachments";

const limits = { maxAttachments: 3, maxAttachmentBytes: 1000 };

function file(name: string, size = 10, type = "text/plain"): FileLike {
  return { name, size, type };
}

function held(name: string, size = 10): Attachment {
  return { id: name, name, size, type: "text/plain", file: file(name, size) as File };
}

describe("intakeFiles", () => {
  it("accepts files inside the limits", () => {
    const { accepted, rejected } = intakeFiles([], [file("a.txt"), file("b.txt")], limits);
    expect(accepted).toHaveLength(2);
    expect(rejected).toEqual([]);
  });

  it("gives every accepted file a distinct id", () => {
    const { accepted } = intakeFiles([], [file("a.txt"), file("b.txt")], limits);
    expect(new Set(accepted.map((a) => a.id)).size).toBe(2);
  });

  it("rejects a file over the size ceiling and says why", () => {
    const { accepted, rejected } = intakeFiles([], [file("big.bin", 2000)], limits);
    expect(accepted).toEqual([]);
    expect(rejected[0]).toMatchObject({ name: "big.bin" });
    expect(rejected[0].reason).toContain("larger than");
  });

  it("counts files already attached against the limit", () => {
    const existing = [held("1.txt"), held("2.txt")];
    const { accepted, rejected } = intakeFiles(
      existing,
      [file("3.txt"), file("4.txt")],
      limits,
    );
    expect(accepted).toHaveLength(1);
    expect(rejected[0].reason).toContain("over the limit of 3");
  });

  it("rejects an exact duplicate rather than attaching it twice", () => {
    const { accepted, rejected } = intakeFiles(
      [held("dup.txt", 10)],
      [file("dup.txt", 10)],
      limits,
    );
    expect(accepted).toEqual([]);
    expect(rejected[0].reason).toBe("already attached");
  });

  it("reports every rejection in one pass instead of stopping at the first", () => {
    const { rejected } = intakeFiles([], [file("a", 9999), file("b", 9999)], limits);
    expect(rejected).toHaveLength(2);
  });

  it("handles an empty drop", () => {
    expect(intakeFiles([], [], limits)).toEqual({ accepted: [], rejected: [] });
  });
});

describe("toMeta", () => {
  it("strips the File handle so no bytes reach a provider", () => {
    const meta: AttachmentMeta[] = toMeta([held("a.txt")]);
    expect(meta[0]).toEqual({ id: "a.txt", name: "a.txt", size: 10, type: "text/plain" });
    expect("file" in meta[0]).toBe(false);
  });
});
