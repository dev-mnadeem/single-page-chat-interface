import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "./MarkdownRenderer";

/**
 * Assistant output is untrusted. These are regression tests for the two ways a
 * Markdown renderer becomes an XSS sink: adding a raw-HTML rehype plugin, and
 * trusting link protocols.
 */
describe("MarkdownRenderer safety", () => {
  it("escapes a script tag instead of executing it", () => {
    const { container } = render(
      <MarkdownRenderer content={"<script>window.pwned = true</script>"} />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>window.pwned = true</script>");
  });

  it("escapes an inline event handler on an img tag", () => {
    const { container } = render(
      <MarkdownRenderer content={'<img src=x onerror="window.pwned = true">'} />,
    );
    expect(container.querySelector("img")).toBeNull();
    // The payload survives as visible text, which is the safe outcome.
    expect(container.textContent).toContain("onerror=");
    expect(container.querySelector("[onerror]")).toBeNull();
  });

  it("escapes an iframe", () => {
    const { container } = render(
      <MarkdownRenderer content={'<iframe src="https://evil.test"></iframe>'} />,
    );
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("renders a javascript: link as inert text, not an anchor", () => {
    const { container } = render(
      <MarkdownRenderer content="[click me](javascript:alert(1))" />,
    );
    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText("click me")).toBeInTheDocument();
  });

  it("renders an https link with noopener", () => {
    render(<MarkdownRenderer content="[docs](https://example.com)" />);
    const link = screen.getByRole("link", { name: "docs" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});

describe("MarkdownRenderer formatting", () => {
  it("renders a fenced block with its language label and a copy button", () => {
    render(<MarkdownRenderer content={"```typescript\nconst a = 1;\n```"} />);
    expect(screen.getByText("typescript")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy code/i })).toBeInTheDocument();
    expect(screen.getByText(/const a = 1;/)).toBeInTheDocument();
  });

  it("does not nest one pre inside another", () => {
    const { container } = render(<MarkdownRenderer content={"```\nplain\n```"} />);
    expect(container.querySelectorAll("pre")).toHaveLength(1);
  });

  it("renders inline code differently from a fenced block", () => {
    const { container } = render(<MarkdownRenderer content="use `cn()` here" />);
    expect(container.querySelector("pre")).toBeNull();
    expect(container.querySelector("code")?.textContent).toBe("cn()");
  });

  it("renders GFM tables", () => {
    render(<MarkdownRenderer content={"| a | b |\n| - | - |\n| 1 | 2 |"} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders lists and headings", () => {
    render(<MarkdownRenderer content={"## Title\n\n- one\n- two"} />);
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
