import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";
import { sanitiseHref } from "../lib/markdown";

/**
 * Renders assistant output as Markdown.
 *
 * Assistant text is untrusted input: a model can be talked into emitting
 * `<img onerror=...>`, and a proxy response can be tampered with. Safety here
 * rests on two rules, both of which have a regression test:
 *
 *  1. **No `rehype-raw`.** react-markdown escapes embedded HTML unless a raw
 *     plugin is added, so `<script>` arrives as visible text. Adding that
 *     plugin is what turns this component into an XSS sink.
 *  2. **No `dangerouslySetInnerHTML`** anywhere in the render path.
 *
 * Link `href`s are additionally filtered, because a `javascript:` URL executes
 * on click even when the surrounding HTML was escaped.
 */

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
}) => (
  <div className={`text-[14.5px] leading-relaxed text-ink ${className}`}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
        code: ({ children }) => (
          <code className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[12.5px] text-accent">
            {children}
          </code>
        ),
        a: ({ href, children }) => {
          const safe = sanitiseHref(href);
          return safe ? (
            <a
              href={safe}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:no-underline"
            >
              {children}
            </a>
          ) : (
            <span className="text-ink-muted line-through">{children}</span>
          );
        },
        p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
        ul: ({ children }) => (
          <ul className="mb-2.5 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2.5 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
        ),
        li: ({ children }) => <li className="pl-0.5">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic text-ink-muted">{children}</em>,
        h1: ({ children }) => (
          <h1 className="mt-4 mb-2 text-lg font-semibold first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-4 mb-2 text-base font-semibold first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-3 mb-1.5 text-sm font-semibold first:mt-0">{children}</h3>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-2.5 border-l-2 border-accent/50 pl-3 text-ink-muted">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="thin-scrollbar my-3 overflow-x-auto rounded-lg border border-hairline">
            <table className="w-full text-left text-[13px]">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b border-hairline bg-surface-sunken px-3 py-1.5 font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-hairline px-3 py-1.5 last:border-0">{children}</td>
        ),
        hr: () => <hr className="my-4 border-hairline" />,
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);
