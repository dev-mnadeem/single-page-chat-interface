import React from "react";
import { Sparkles } from "lucide-react";
import { SUGGESTED_PROMPTS } from "../lib/suggestions";

export const EmptyState: React.FC<{ onSelect: (prompt: string) => void }> = ({ onSelect }) => (
  <div className="flex flex-col items-center gap-5 py-16 text-center">
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
      <Sparkles className="h-5 w-5" />
    </div>
    <div className="space-y-1.5">
      <h2 className="text-lg font-semibold text-ink">Start a conversation</h2>
      <p className="max-w-md text-[13.5px] text-ink-muted">
        Answers are composed locally and streamed back chunk by chunk. Use the request options
        to change the shape, tone and length of what comes back.
      </p>
    </div>
    <ul className="flex max-w-xl flex-wrap justify-center gap-2">
      {SUGGESTED_PROMPTS.map((prompt) => (
        <li key={prompt}>
          <button
            type="button"
            onClick={() => onSelect(prompt)}
            className="rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-[12.5px] text-ink transition-colors hover:border-accent/40 hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {prompt}
          </button>
        </li>
      ))}
    </ul>
  </div>
);
