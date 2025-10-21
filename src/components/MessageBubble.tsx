import React, { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Check, Copy, RotateCcw, Square, TriangleAlert, User } from "lucide-react";
import type { Message } from "../types";
import { formatTime } from "../lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";

const COPIED_RESET_MS = 1600;

const StatusNote: React.FC<{ message: Message; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => {
  if (message.status === "cancelled") {
    return (
      <span className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-muted">
        <Square className="h-2.5 w-2.5" /> stopped
      </span>
    );
  }
  if (message.status === "error") {
    return (
      <span className="mt-1.5 flex items-center gap-2 text-[11px] text-danger">
        <TriangleAlert className="h-3 w-3" /> this turn failed
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 font-medium underline underline-offset-2 hover:no-underline"
          >
            <RotateCcw className="h-3 w-3" /> retry
          </button>
        )}
      </span>
    );
  }
  return null;
};

interface MessageBubbleProps {
  message: Message;
  onRetry?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onRetry }) => {
  const isUser = message.sender === "user";
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      // Denied clipboard permission is not worth interrupting the user over.
    }
  }, [message.content]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`group flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
      aria-label={isUser ? "Your message" : "Assistant message"}
    >
      <div
        aria-hidden
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-accent text-white" : "border border-hairline bg-surface text-accent"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      <div
        className={`flex min-w-0 max-w-[min(42rem,82%)] flex-col ${isUser ? "items-end" : ""}`}
      >
        <div
          className={`min-w-0 rounded-2xl px-4 py-2.5 ${
            isUser
              ? "rounded-tr-sm bg-accent text-[14.5px] leading-relaxed text-white"
              : "rounded-tl-sm border border-hairline bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <MarkdownRenderer
              content={message.content}
              className={message.status === "streaming" ? "streaming-body" : ""}
            />
          )}

          {message.attachments && message.attachments.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5 border-t border-white/25 pt-2">
              {message.attachments.map((file) => (
                <li
                  key={file.id}
                  className="rounded-md bg-white/20 px-2 py-0.5 font-mono text-[11px]"
                >
                  {file.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <StatusNote message={message} onRetry={onRetry} />

        <div
          className={`mt-1 flex items-center gap-2 text-[11px] text-ink-muted ${
            isUser ? "flex-row-reverse" : ""
          }`}
        >
          <time dateTime={message.timestamp.toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {message.content !== "" && message.status !== "streaming" && (
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1 rounded px-1 opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
              aria-label={copied ? "Message copied" : "Copy message"}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
};
