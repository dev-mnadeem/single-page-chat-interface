import React from "react";
import { Bot } from "lucide-react";

const DOT_STAGGER_MS = 160;
const DOT_COUNT = 3;
const DOT_DELAYS_MS = Array.from({ length: DOT_COUNT }, (_, index) => index * DOT_STAGGER_MS);

/** Shown between "request sent" and "first chunk arrived". */
export const TypingIndicator: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex gap-3" role="status" aria-live="polite">
    <div
      aria-hidden
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-accent"
    >
      <Bot className="h-3.5 w-3.5" />
    </div>
    <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-hairline bg-surface px-4 py-3">
      <span className="flex gap-1" aria-hidden>
        {DOT_DELAYS_MS.map((delay) => (
          <span
            key={delay}
            className="typing-dot h-1.5 w-1.5 rounded-full bg-accent"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span className="sr-only">{label} is replying</span>
    </div>
  </div>
);
