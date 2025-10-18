import type { AttachmentMeta, ChatOptions, ResponseStyle } from "../../types";
import { createRandom, pick } from "../rng";

/**
 * Turns a routed style plus the request options into Markdown.
 *
 * Nothing here contacts a model. The point of the module is that the options
 * panel has to *visibly* change the answer, otherwise the controls are
 * decoration - so every option is wired to something concrete:
 *
 * | Option           | Effect                                              |
 * |------------------|-----------------------------------------------------|
 * | `responseLength` | which sections are emitted, and the fallback style   |
 * | `tone`           | the opening sentence                                 |
 * | `readingLevel`   | the depth qualifier that follows the opener          |
 * | `temperature`    | how many phrasing variants are in play               |
 * | `includeOutline` | appends the key-points outline to prose answers      |
 * | `model`          | named in the trailer so the transcript records it    |
 */

/** At 0 the first variant always wins; at 1 the whole pool is in play. */
export function variantWindow<T>(pool: readonly T[], temperature: number): readonly T[] {
  const clamped = Math.min(Math.max(temperature, 0), 1);
  const size = Math.max(1, Math.round(clamped * pool.length));
  return pool.slice(0, size);
}

const TONE_OPENERS: Record<ChatOptions["tone"], readonly string[]> = {
  professional: [
    "Here is a structured read on that.",
    "Taking that in order, the picture looks like this.",
    "A considered answer, with the caveats stated up front.",
  ],
  casual: [
    "Good one - here is the short of it.",
    "Sure thing, let's dig in.",
    "Happy to take a swing at that.",
  ],
  friendly: [
    "Great question - let me walk you through it.",
    "I'd be glad to help with that.",
    "Lovely question. Here is how I'd think about it.",
  ],
  technical: [
    "From an implementation standpoint, the answer breaks down as follows.",
    "Mechanically, there are three moving parts worth separating.",
    "Treating this as a systems question rather than a naming one:",
  ],
};

const READING_LEVEL_NOTE: Record<ChatOptions["readingLevel"], string> = {
  beginner: "I'll keep the vocabulary plain and skip the edge cases.",
  intermediate: "I'll assume you know the basics and focus on the decisions.",
  advanced: "I'll go straight to the trade-offs and skip the introduction.",
};

const MAX_PROMPT_ECHO = 80;
const ELLIPSIS = "...";

function quotePrompt(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  return trimmed.length > MAX_PROMPT_ECHO
    ? `${trimmed.slice(0, MAX_PROMPT_ECHO - ELLIPSIS.length)}${ELLIPSIS}`
    : trimmed;
}

function opener(options: ChatOptions, random: () => number): string {
  const pool = variantWindow(TONE_OPENERS[options.tone], options.temperature);
  return pick(pool, random);
}

function attachmentNote(attachments: readonly AttachmentMeta[]): string {
  if (attachments.length === 0) return "";
  const names = attachments.map((file) => `\`${file.name}\``).join(", ");
  const noun = attachments.length === 1 ? "file" : "files";
  return `I read the ${attachments.length} attached ${noun} (${names}) and folded them in below.\n`;
}

const OUTLINE = [
  "What the term covers, and what it deliberately excludes",
  "Where it shows up in practice",
  "The decision you actually have to make",
  "How to tell whether it worked",
]
  .map((item) => `- ${item}`)
  .join("\n");

function summary(prompt: string, options: ChatOptions): string {
  const head =
    `**${quotePrompt(prompt)}** is best approached as three separate questions that ` +
    "people usually ask as one: what the thing *is*, when it is the right tool, and " +
    "what it costs you when it is not.\n\n" +
    "The first is a definition problem and it is the easy part. The second is a fit " +
    "problem and it is where most of the disagreement lives. The third is the one that " +
    "gets skipped, and it is the one that shows up six months later.\n";

  if (options.responseLength === "long") {
    return (
      head +
      "\nOn fit: the honest test is whether you can name the cost you are removing. If " +
      "you cannot point at a specific slow path, a specific duplicated rule, or a " +
      "specific class of bug, the abstraction is speculative and should wait.\n\n" +
      "On cost: every layer you add is a layer someone has to read before they can make " +
      "a one-line change. That is a real, recurring tax, and it is worth paying only " +
      "when the thing it buys is also recurring.\n"
    );
  }
  return head;
}

function bullets(options: ChatOptions): string {
  const core = [
    "**The core idea** - one sentence you could say out loud without hedging.",
    "**Where it applies** - the situations it was designed for, not the ones it tolerates.",
    "**What it costs** - the reading, maintenance and onboarding tax it adds.",
    "**How you would know** - the signal that tells you it is working.",
  ];
  const extra = [
    "**Where it breaks down** - the case everyone hits in month three.",
    "**What to measure** - the one number that would change your mind.",
  ];
  const chosen = options.responseLength === "short" ? core.slice(0, 2) : core;
  const all = options.responseLength === "long" ? [...chosen, ...extra] : chosen;
  return `${all.map((item) => `- ${item}`).join("\n")}\n`;
}

function steps(options: ChatOptions): string {
  const base = [
    "**Write down what you already know.** Half of these questions dissolve once the " +
      "current behaviour is written out in full.",
    "**Name the smallest change that would help.** Not the ideal design, the next one.",
    "**Make it, and make it reversible.** A change you can undo in a minute is a change " +
      "you can afford to be wrong about.",
    "**Check the thing you predicted would change.** If nothing moved, you fixed the " +
      "wrong problem.",
  ];
  const extra = [
    "**Write the test that would have caught it**, so the next person inherits the " +
      "answer rather than the question.",
  ];
  const chosen = options.responseLength === "short" ? base.slice(0, 2) : base;
  const all = options.responseLength === "long" ? [...chosen, ...extra] : chosen;
  return `${all.map((step, index) => `${index + 1}. ${step}`).join("\n")}\n`;
}

function definition(prompt: string, options: ChatOptions): string {
  const head =
    `> **${quotePrompt(prompt)}** - a way of organising work so that the decision and ` +
    "the mechanism that carries it out can change independently.\n\n" +
    "The useful half of that sentence is *independently*. If changing the decision " +
    "forces you to rewrite the mechanism, you have one thing wearing two names.\n";

  if (options.responseLength === "short") return head;

  return (
    head +
    "\n**A worked example.** A thermostat decides, a relay switches. Swap the relay for " +
    "a smart plug and the thermostat does not care. Swap the thermostat for a schedule " +
    "and the relay does not care. That indifference is the property being described, " +
    "not the wiring and not the vocabulary.\n"
  );
}

function qa(options: ChatOptions): string {
  const pairs: Array<[string, string]> = [
    [
      "What is the shortest honest answer?",
      "It depends on whether the two things you are choosing between change at " +
        "different rates. If they change together, keep them together.",
    ],
    [
      "Why does it come up so often?",
      "Because it is cheap to get right at the start and expensive to fix later, so it " +
        "gets argued about at exactly the moment nobody has evidence yet.",
    ],
  ];
  if (options.responseLength !== "short") {
    pairs.push([
      "What would change my mind?",
      "A second consumer. One caller is a preference, two callers with different needs " +
        "is a requirement.",
    ]);
  }
  return `${pairs.map(([question, answer]) => `**Q. ${question}**\n\nA. ${answer}`).join("\n\n")}\n`;
}

function code(options: ChatOptions): string {
  const head =
    "The shape that usually helps is a narrow interface with the awkward part behind " +
    "it:\n\n" +
    "```typescript\n" +
    "interface Clock {\n" +
    "  now(): Date;\n" +
    "}\n" +
    "\n" +
    "const systemClock: Clock = { now: () => new Date() };\n" +
    "\n" +
    "export function isExpired(\n" +
    "  issuedAt: Date,\n" +
    "  ttlMs: number,\n" +
    "  clock: Clock = systemClock,\n" +
    "): boolean {\n" +
    "  return clock.now().getTime() - issuedAt.getTime() > ttlMs;\n" +
    "}\n" +
    "```\n\n" +
    "One interface, one default, and the caller only reaches for the seam when it needs " +
    "to. In a test that seam is the difference between a deterministic assertion and a " +
    "`setTimeout`.\n";

  if (options.responseLength !== "long") return head;

  return (
    head +
    "\nThe same move works for anything ambient - randomness, the filesystem, the " +
    "network:\n\n" +
    "```typescript\n" +
    "const frozenClock = (at: Date): Clock => ({ now: () => at });\n" +
    "\n" +
    'const issued = new Date("2024-01-01");\n' +
    'expect(isExpired(issued, 1000, frozenClock(new Date("2024-01-02")))).toBe(true);\n' +
    "```\n"
  );
}

const QUIPS = [
  "Short version: it is a naming problem wearing an architecture costume.",
  "Short version: do the boring thing until the boring thing hurts.",
  "Short version: you will know when you need it, and not before.",
];

function quip(options: ChatOptions, random: () => number): string {
  return `${pick(variantWindow(QUIPS, options.temperature), random)}\n`;
}

function body(
  prompt: string,
  style: ResponseStyle,
  options: ChatOptions,
  random: () => number,
): string {
  switch (style) {
    case "summary":
      return summary(prompt, options);
    case "bullets":
      return bullets(options);
    case "steps":
      return steps(options);
    case "definition":
      return definition(prompt, options);
    case "qa":
      return qa(options);
    case "code":
      return code(options);
    case "quip":
      return quip(options, random);
  }
}

/** Styles where a bullet outline reads as an addition rather than a duplicate. */
const OUTLINE_STYLES: readonly ResponseStyle[] = ["summary", "definition", "qa"];

export interface ComposeInput {
  prompt: string;
  style: ResponseStyle;
  options: ChatOptions;
  attachments: readonly AttachmentMeta[];
}

/**
 * Deterministic: the same input always produces the same Markdown, because the
 * generator is seeded from the input rather than from the clock.
 */
export function compose({ prompt, style, options, attachments }: ComposeInput): string {
  const seed = [
    prompt,
    style,
    options.tone,
    options.model,
    options.readingLevel,
    options.responseLength,
    options.temperature.toFixed(2),
    String(options.includeOutline),
    attachments.map((file) => file.name).join("|"),
  ].join(" ");

  const random = createRandom(seed);
  const parts: string[] = [];

  parts.push(`${opener(options, random)} ${READING_LEVEL_NOTE[options.readingLevel]}\n`);

  const note = attachmentNote(attachments);
  if (note) parts.push(note);

  parts.push(body(prompt, style, options, random));

  if (options.includeOutline && OUTLINE_STYLES.includes(style)) {
    parts.push(`**Outline**\n\n${OUTLINE}\n`);
  }

  parts.push(
    `_Scripted locally in the \`${style}\` style - no ${options.model} request was made._`,
  );

  return parts.join("\n");
}
