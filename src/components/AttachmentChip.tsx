import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { Attachment } from "../types";
import { formatFileSize } from "../lib/utils";
import { iconForType } from "../lib/fileIcons";

interface AttachmentChipProps {
  attachment: Attachment;
  onRemove: (id: string) => void;
}

export const AttachmentChip: React.FC<AttachmentChipProps> = ({ attachment, onRemove }) => {
  const Icon = iconForType(attachment.type);

  return (
    <motion.li
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.14 }}
      className="flex items-center gap-2 rounded-lg border border-hairline bg-surface py-1 pl-2 pr-1"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
      <span className="max-w-[12rem] truncate text-[12px] text-ink">{attachment.name}</span>
      <span className="text-[11px] tabular-nums text-ink-muted">
        {formatFileSize(attachment.size)}
      </span>
      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        className="rounded p-1 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        aria-label={`Remove ${attachment.name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </motion.li>
  );
};
