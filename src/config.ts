/**
 * Single source of truth for runtime configuration.
 *
 * Everything here is read once at module load. Vite inlines `import.meta.env`
 * at build time, so *every* value in this file ends up in the JavaScript that
 * is shipped to the browser. That constraint is why there is no API-key option:
 * see `findLeakedSecrets` below.
 */

export type ProviderKind = "local" | "http";

export interface AppConfig {
  /** Which chat backend to talk to. `local` needs no network and no key. */
  provider: ProviderKind;
  /** Base URL of a server-side proxy that holds the real model credentials. */
  apiBaseUrl: string;
  /** Delay between streamed chunks in the local provider, in milliseconds. */
  streamChunkDelayMs: number;
  /** Maximum number of files that may ride along with one message. */
  maxAttachments: number;
  /** Per-file size ceiling in bytes. */
  maxAttachmentBytes: number;
  /** How many messages are kept in the persisted session. */
  persistedMessageLimit: number;
}

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const DEFAULT_ATTACHMENT_MB = 10;

export const DEFAULT_STREAM_CHUNK_DELAY_MS = 28;
export const DEFAULT_MAX_ATTACHMENTS = 5;
export const DEFAULT_MAX_ATTACHMENT_BYTES = DEFAULT_ATTACHMENT_MB * BYTES_PER_MB;
export const DEFAULT_PERSISTED_MESSAGE_LIMIT = 200;

/** Environment keys that would ship a credential to every visitor. */
const SECRET_KEY_PATTERN = /(^|_)(API_?KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)/i;

/**
 * Returns the names of any client-side environment variables that look like
 * credentials.
 *
 * A `VITE_`-prefixed variable is not a secret store: Vite substitutes it into
 * the bundle as a string literal, so anyone who opens devtools can read it.
 * The app therefore refuses to accept a model key this way, and instead talks
 * to a proxy that keeps the key server-side.
 */
export function findLeakedSecrets(env: Record<string, unknown>): string[] {
  return Object.keys(env)
    .filter((key) => key.startsWith("VITE_"))
    .filter((key) => SECRET_KEY_PATTERN.test(key))
    .filter((key) => typeof env[key] === "string" && env[key] !== "")
    .sort();
}

function parseProvider(raw: unknown): ProviderKind {
  return raw === "http" ? "http" : "local";
}

function parsePositiveInt(raw: unknown, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function buildConfig(env: Record<string, unknown>): AppConfig {
  return {
    provider: parseProvider(env.VITE_CHAT_PROVIDER),
    apiBaseUrl:
      typeof env.VITE_CHAT_API_BASE_URL === "string" ? env.VITE_CHAT_API_BASE_URL : "",
    streamChunkDelayMs: parsePositiveInt(
      env.VITE_STREAM_CHUNK_DELAY_MS,
      DEFAULT_STREAM_CHUNK_DELAY_MS,
    ),
    maxAttachments: parsePositiveInt(env.VITE_MAX_ATTACHMENTS, DEFAULT_MAX_ATTACHMENTS),
    maxAttachmentBytes: parsePositiveInt(
      env.VITE_MAX_ATTACHMENT_BYTES,
      DEFAULT_MAX_ATTACHMENT_BYTES,
    ),
    persistedMessageLimit: DEFAULT_PERSISTED_MESSAGE_LIMIT,
  };
}

const env = import.meta.env as unknown as Record<string, unknown>;

export const config: AppConfig = buildConfig(env);

const leaked = findLeakedSecrets(env);
if (leaked.length > 0) {
  console.warn(
    `[config] ${leaked.join(", ")} will be inlined into the browser bundle and is readable ` +
      "by anyone who loads the page. Move the credential behind VITE_CHAT_API_BASE_URL instead.",
  );
}
