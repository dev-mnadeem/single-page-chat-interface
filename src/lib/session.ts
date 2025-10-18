import type { Message } from "../types";

/**
 * Conversation persistence in `localStorage`.
 *
 * Every access is wrapped: Safari's private mode throws on `getItem`, users
 * clear site data, and a stale payload from an older schema is a normal thing
 * to find. None of those should be able to blank the screen, so a failure
 * degrades to "no saved session" rather than to an exception during render.
 */

export const SESSION_STORAGE_KEY = "chat.session.v1";

interface PersistedMessage {
  id: string;
  sender: Message["sender"];
  content: string;
  timestamp: string;
  status: Message["status"];
}

function isPersistedMessage(value: unknown): value is PersistedMessage {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    (record.sender === "user" || record.sender === "assistant") &&
    typeof record.content === "string" &&
    typeof record.timestamp === "string"
  );
}

export function serialiseMessages(messages: readonly Message[], limit: number): string {
  const persisted: PersistedMessage[] = messages
    .slice(-limit)
    .filter((message) => message.status !== "streaming")
    .map(({ id, sender, content, status }) => ({
      id,
      sender,
      content,
      status,
      timestamp: new Date().toISOString(),
    }));
  return JSON.stringify(persisted);
}

export function deserialiseMessages(raw: string): Message[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isPersistedMessage).map((message) => ({
    id: message.id,
    sender: message.sender,
    content: message.content,
    status: message.status ?? "complete",
    timestamp: new Date(message.timestamp),
  }));
}

export function loadSession(storage: Storage | undefined = safeStorage()): Message[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    return raw ? deserialiseMessages(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(
  messages: readonly Message[],
  limit: number,
  storage: Storage | undefined = safeStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(SESSION_STORAGE_KEY, serialiseMessages(messages, limit));
  } catch {
    // A quota or private-mode failure costs the user their history, not the app.
  }
}

export function clearSession(storage: Storage | undefined = safeStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Same reasoning as saveSession.
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
