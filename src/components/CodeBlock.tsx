import React, { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { readFence } from "../lib/markdown";

const COPIED_RESET_MS = 1600;

/**
 * A fenced code block with a language label and a copy button.
 *
 * It replaces react-markdown's `<pre>` rather than its `<code>`: overriding
 * `code` and returning a `<pre>` nests one inside the other, which is where
 * the doubled padding in most hand-rolled Markdown renderers comes from.
 */
export const CodeBlock: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { code, language } = readFence(children);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      // Clipboard access is denied in some embedded contexts. The code is still
      // selectable, so there is nothing useful to say here.
    }
  }, [code]);

  return (
    <figure className="my-3 overflow-hidden rounded-xl border border-hairline bg-surface-sunken">
      <figcaption className="flex items-center justify-between border-b border-hairline px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:bg-hairline/60 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={copied ? "Code copied" : "Copy code"}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>
      <pre className="thin-scrollbar overflow-x-auto px-3 py-3 text-[12.5px] leading-relaxed">
        <code className="font-mono text-ink">{code}</code>
      </pre>
    </figure>
  );
};
