import type { Attachment, AttachmentMeta } from "../types";
import { formatFileSize } from "./utils";

export interface AttachmentLimits {
  maxAttachments: number;
  maxAttachmentBytes: number;
}

export interface RejectedFile {
  name: string;
  reason: string;
}

export interface AttachmentIntake {
  accepted: Attachment[];
  rejected: RejectedFile[];
}

/** Minimal surface of `File` this module needs, so tests need no DOM. */
export type FileLike = Pick<File, "name" | "size" | "type">;

const ID_RADIX = 36;
const ID_ENTROPY = 1_000_000_000;

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const suffix = Math.floor(Math.random() * ID_ENTROPY).toString(ID_RADIX);
  return `att-${Date.now().toString(ID_RADIX)}-${suffix}`;
}

/**
 * Validates incoming files against the limits and reports *why* each rejection
 * happened.
 *
 * Returning the rejections instead of raising an `alert()` is the point: the
 * caller renders them inline, one line per file, and a drop of six files
 * produces one message rather than six modal dialogs the user has to dismiss.
 */
export function intakeFiles(
  existing: readonly Attachment[],
  incoming: readonly FileLike[],
  limits: AttachmentLimits,
): AttachmentIntake {
  const accepted: Attachment[] = [];
  const rejected: RejectedFile[] = [];

  for (const file of incoming) {
    if (existing.length + accepted.length >= limits.maxAttachments) {
      rejected.push({
        name: file.name,
        reason: `over the limit of ${limits.maxAttachments} files`,
      });
      continue;
    }
    if (file.size > limits.maxAttachmentBytes) {
      rejected.push({
        name: file.name,
        reason: `larger than ${formatFileSize(limits.maxAttachmentBytes)}`,
      });
      continue;
    }
    if (existing.some((held) => held.name === file.name && held.size === file.size)) {
      rejected.push({ name: file.name, reason: "already attached" });
      continue;
    }

    accepted.push({
      id: newId(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file as File,
    });
  }

  return { accepted, rejected };
}

/** Strips the `File` handle, leaving only what a provider is allowed to see. */
export function toMeta(attachments: readonly Attachment[]): AttachmentMeta[] {
  return attachments.map(({ id, name, size, type }) => ({ id, name, size, type }));
}
