import React from "react";

/**
 * Pure helpers for rendering assistant Markdown. They live outside the
 * component so they can be unit tested without a DOM, and so the component
 * file exports nothing but a component.
 */

const SAFE_LINK_PROTOCOLS = ["http:", "https:", "mailto:"];
const RELATIVE_BASE = "https://example.invalid";

/**
 * Drops link targets that would execute rather than navigate.
 *
 * Escaping HTML is not enough on its own: `[click](javascript:alert(1))` is
 * valid Markdown and produces a real anchor, so the protocol has to be checked
 * separately from the raw-HTML question.
 */
export function sanitiseHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  if (href.startsWith("#") || href.startsWith("/")) return href;
  try {
    const url = new URL(href, RELATIVE_BASE);
    return SAFE_LINK_PROTOCOLS.includes(url.protocol) ? href : undefined;
  } catch {
    return undefined;
  }
}

/** Flattens a React subtree back to the text it renders. */
export function nodeToText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return nodeToText(node.props.children);
  }
  return "";
}

/** Reads `language-ts` off the `<code>` element react-markdown nests in `<pre>`. */
export function readFence(node: React.ReactNode): { code: string; language: string } {
  if (React.isValidElement<{ className?: string; children?: React.ReactNode }>(node)) {
    const match = /language-([\w+-]+)/.exec(node.props.className ?? "");
    return { code: nodeToText(node.props.children), language: match ? match[1] : "" };
  }
  return { code: nodeToText(node), language: "" };
}
