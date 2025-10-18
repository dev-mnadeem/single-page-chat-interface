export type Sender = "user" | "assistant";

/**
 * How a single assistant turn ended, or where it currently is.
 *
 * `streaming` is the only non-terminal value: a message carrying it is still
 * growing. The other three are the outcomes the UI has to render differently
 * (a cancelled answer keeps whatever text arrived before the stop).
 */
export type MessageStatus = "streaming" | "complete" | "cancelled" | "error";

export interface Message {
  id: string;
  sender: Sender;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  /** Filenames that rode along with a user message, kept for the transcript. */
  attachments?: AttachmentMeta[];
}

/** What the provider is told about an attachment. File bytes never leave the tab. */
export interface AttachmentMeta {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface Attachment extends AttachmentMeta {
  file: File;
}

export type ResponseLength = "short" | "medium" | "long";
export type ModelChoice = "gpt-4" | "gpt-3.5-turbo" | "claude-3" | "gemini-pro";
export type Tone = "professional" | "casual" | "friendly" | "technical";
export type ReadingLevel = "beginner" | "intermediate" | "advanced";

export interface ChatOptions {
  responseLength: ResponseLength;
  model: ModelChoice;
  tone: Tone;
  temperature: number;
  includeOutline: boolean;
  readingLevel: ReadingLevel;
}

/** The shape the scripted provider composes its answer in. */
export type ResponseStyle =
  "summary" | "bullets" | "steps" | "quip" | "definition" | "qa" | "code";

export const DEFAULT_OPTIONS: ChatOptions = {
  responseLength: "medium",
  model: "gpt-4",
  tone: "friendly",
  temperature: 0.7,
  includeOutline: false,
  readingLevel: "intermediate",
};
