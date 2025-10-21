import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Paperclip, Send, Square } from "lucide-react";
import type { Attachment } from "../types";
import type { RejectedFile } from "../lib/attachments";
import { intakeFiles } from "../lib/attachments";
import { config } from "../config";
import { AttachmentChip } from "./AttachmentChip";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

const MIN_TEXTAREA_PX = 24;
const MAX_TEXTAREA_PX = 200;
const REJECTION_TIMEOUT_MS = 6000;

interface MessageComposerProps {
  onSend: (message: string, attachments: Attachment[]) => void;
  onCancel: () => void;
  busy: boolean;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
}

/**
 * The input row.
 *
 * Three details here are what separate a chat box that feels right from one
 * that does not:
 *
 *  - **The textarea is never disabled while a reply streams.** Freezing the
 *    input is the easy way to prevent a double-send, but it also stops the
 *    user drafting their follow-up during the one moment they have to spare.
 *    The *send action* is gated instead, and turns into Stop.
 *  - **Enter is ignored while an IME composition is open.** Without the
 *    `isComposing` guard, picking a candidate in a Japanese, Chinese or Korean
 *    keyboard sends a half-finished message.
 *  - **Escape stops the stream**, so cancelling never requires the mouse.
 */
export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  onCancel,
  busy,
  attachments,
  onAttachmentsChange,
}) => {
  const [draft, setDraft] = useState("");
  const [dragging, setDragging] = useState(false);
  const [rejections, setRejections] = useState<RejectedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grow with the content up to a ceiling, then scroll inside.
  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(
      Math.max(element.scrollHeight, MIN_TEXTAREA_PX),
      MAX_TEXTAREA_PX,
    )}px`;
  }, [draft]);

  const submit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed === "" || busy) return;
    onSend(trimmed, attachments);
    setDraft("");
    onAttachmentsChange([]);
  }, [attachments, busy, draft, onAttachmentsChange, onSend]);

  const takeFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const { accepted, rejected } = intakeFiles(attachments, Array.from(files), {
        maxAttachments: config.maxAttachments,
        maxAttachmentBytes: config.maxAttachmentBytes,
      });
      if (accepted.length > 0) onAttachmentsChange([...attachments, ...accepted]);
      if (rejected.length > 0) {
        setRejections(rejected);
        setTimeout(() => setRejections([]), REJECTION_TIMEOUT_MS);
      }
    },
    [attachments, onAttachmentsChange],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // `nativeEvent.isComposing` is true while an IME candidate window is open.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key === "Escape" && busy) {
      event.preventDefault();
      onCancel();
    }
  };

  const atAttachmentLimit = attachments.length >= config.maxAttachments;

  return (
    <div className="shrink-0 border-t border-hairline bg-surface/85 backdrop-blur">
      <form
        className="mx-auto max-w-3xl px-4 py-3 sm:px-6 sm:py-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <AnimatePresence>
          {rejections.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 overflow-hidden text-[12px] text-danger"
              role="alert"
            >
              {rejections.map((rejection) => (
                <li key={`${rejection.name}-${rejection.reason}`}>
                  <span className="font-medium">{rejection.name}</span> was not attached -{" "}
                  {rejection.reason}.
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 flex flex-wrap gap-2 overflow-hidden"
            >
              <AnimatePresence initial={false}>
                {attachments.map((attachment) => (
                  <AttachmentChip
                    key={attachment.id}
                    attachment={attachment}
                    onRemove={(id) =>
                      onAttachmentsChange(attachments.filter((item) => item.id !== id))
                    }
                  />
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </AnimatePresence>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            takeFiles(event.dataTransfer.files);
          }}
          className={`flex items-end gap-2 rounded-2xl border px-3 py-2.5 transition-colors ${
            dragging
              ? "border-accent bg-accent-soft"
              : "border-hairline bg-surface focus-within:border-accent/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              takeFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={atAttachmentLimit}
            aria-label={
              atAttachmentLimit
                ? `Attachment limit of ${config.maxAttachments} reached`
                : "Attach files"
            }
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              dragging ? "Drop the files here" : "Send a message. Shift+Enter for a new line."
            }
            aria-label="Message"
            className="max-h-[200px] py-1"
          />

          {busy ? (
            <Button variant="outline" size="icon" onClick={onCancel} aria-label="Stop replying">
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="icon"
              disabled={draft.trim() === ""}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="mt-1.5 text-center text-[11px] text-ink-muted">
          {busy
            ? "Streaming - press Escape or Stop to interrupt"
            : `Enter to send, Shift+Enter for a new line, up to ${config.maxAttachments} files`}
        </p>
      </form>
    </div>
  );
};
