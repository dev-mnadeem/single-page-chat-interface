import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import type { Message } from "../types";
import type { TurnPhase } from "../lib/chat/turnMachine";
import { useStickToBottom } from "../lib/chat/useStickToBottom";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { EmptyState } from "./EmptyState";

interface MessageListProps {
  messages: Message[];
  phase: TurnPhase;
  providerLabel: string;
  onRetry: () => void;
  onSuggestion: (prompt: string) => void;
}

/**
 * The scrolling transcript.
 *
 * The scroll container lives here rather than in `App` so that the
 * stick-to-bottom decision and the "jump to latest" button that depends on it
 * cannot drift apart.
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  phase,
  providerLabel,
  onRetry,
  onSuggestion,
}) => {
  // Streaming appends to the last message rather than adding one, so the key
  // has to include its length or the view stops following mid-answer.
  const contentKey = `${messages.length}:${messages.at(-1)?.content.length ?? 0}:${phase}`;
  const { containerRef, pinned, scrollToBottom } = useStickToBottom<HTMLDivElement>(contentKey);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        className="thin-scrollbar h-full overflow-y-auto overscroll-contain px-4 py-6 sm:px-6"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {messages.length === 0 ? (
            <EmptyState onSelect={onSuggestion} />
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} onRetry={onRetry} />
            ))
          )}
          {phase === "awaiting" && <TypingIndicator label={providerLabel} />}
        </div>
      </div>

      <AnimatePresence>
        {!pinned && messages.length > 0 && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 text-[12px] font-medium text-ink shadow-md hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Jump to latest
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
