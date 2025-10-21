/**
 * Opening prompts for an empty conversation.
 *
 * Each one is chosen to land on a different branch of the style router in
 * `src/lib/script/styleRouter.ts`, so a first-time visitor sees more than one
 * answer shape without having to guess which keywords matter.
 */
export const SUGGESTED_PROMPTS = [
  "What is a provider interface?",
  "How to make a streaming UI cancellable",
  "Show me code for injecting a clock",
  "List the trade-offs of client-side persistence",
] as const;
