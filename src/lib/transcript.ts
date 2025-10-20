import type { Message } from "../types";

/**
 * Renders a conversation as a Markdown transcript.
 *
 * Assistant text is already Markdown, so it is emitted verbatim. User text is
 * not, so it is quoted as a blockquote - that keeps a user message that
 * happens to start with `#` from turning into a heading in the export.
 */
/** `YYYY-MM-DDTHH:MM:SS` - the ISO string without the fractional seconds. */
const ISO_SECONDS_LENGTH = 19;

export function toMarkdown(messages: readonly Message[], title = "Chat transcript"): string {
  const lines: string[] = [`# ${title}`, ""];

  for (const message of messages) {
    if (message.sender === "user") {
      lines.push("## You", "");
      lines.push(
        ...message.content.split("\n").map((line) => (line === "" ? ">" : `> ${line}`)),
      );
      if (message.attachments?.length) {
        lines.push(">", `> Attached: ${message.attachments.map((f) => f.name).join(", ")}`);
      }
    } else {
      lines.push("## Assistant", "");
      lines.push(message.content.trimEnd());
      if (message.status === "cancelled") lines.push("", "_(stopped early)_");
      if (message.status === "error") lines.push("", "_(this turn failed)_");
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

/** Returns a filename that sorts by date and is safe on every filesystem. */
export function transcriptFilename(at: Date): string {
  return `chat-transcript-${at.toISOString().slice(0, ISO_SECONDS_LENGTH).replace(/[:T]/g, "-")}.md`;
}
