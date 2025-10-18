import type { ChatOptions, ResponseStyle } from "../../types";

/**
 * A keyword that pulls a prompt towards one answer shape.
 *
 * The list is ordered: the first rule whose triggers appear in the prompt
 * wins, so `"how to write a function"` routes to `steps` rather than `code`.
 * Ordering is the whole behaviour here, which is why it lives in one array
 * instead of a chain of ifs.
 */
interface StyleRule {
  style: ResponseStyle;
  triggers: readonly string[];
}

export const STYLE_RULES: readonly StyleRule[] = [
  { style: "steps", triggers: ["how to", "how do i", "steps", "process", "walk me through"] },
  { style: "definition", triggers: ["what is", "what are", "define", "explain", "meaning of"] },
  {
    style: "code",
    triggers: ["code", "function", "snippet", "typescript", "javascript", "api"],
  },
  { style: "bullets", triggers: ["list", "bullets", "items", "options", "pros and cons"] },
  { style: "qa", triggers: ["why", "when", "should i", "is it"] },
];

const LENGTH_FALLBACK: Record<ChatOptions["responseLength"], ResponseStyle> = {
  short: "quip",
  medium: "summary",
  long: "summary",
};

/**
 * Chooses the answer shape for a prompt.
 *
 * Attachments override keywords: if the user dropped files in, what they want
 * is a read of those files, which is a summary.
 */
export function routeStyle(
  prompt: string,
  options: ChatOptions,
  hasAttachments: boolean,
): ResponseStyle {
  if (hasAttachments) return "summary";

  const normalised = prompt.toLowerCase();
  const matched = STYLE_RULES.find((rule) =>
    rule.triggers.some((trigger) => normalised.includes(trigger)),
  );

  return matched ? matched.style : LENGTH_FALLBACK[options.responseLength];
}
