import type { AppConfig } from "../../config";
import { config as defaultConfig } from "../../config";
import { createHttpProvider } from "./httpProvider";
import { createScriptedProvider } from "./scriptedProvider";
import type { ChatProvider } from "./types";

export type { ChatDelta, ChatProvider, ChatTurnRequest } from "./types";
export { ProviderError, abortableDelay, isAbortError } from "./types";
export { createScriptedProvider } from "./scriptedProvider";
export { createHttpProvider } from "./httpProvider";

/**
 * The registry. Adding a third backend means adding one case here and one
 * module beside it; nothing in `src/components` has to change.
 */
export function createProvider(appConfig: AppConfig = defaultConfig): ChatProvider {
  switch (appConfig.provider) {
    case "http":
      return createHttpProvider({ baseUrl: appConfig.apiBaseUrl });
    case "local":
      return createScriptedProvider({ chunkDelayMs: appConfig.streamChunkDelayMs });
  }
}
