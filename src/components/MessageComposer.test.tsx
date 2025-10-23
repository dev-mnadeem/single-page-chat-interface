import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageComposer } from "./MessageComposer";

function setup(overrides: Partial<React.ComponentProps<typeof MessageComposer>> = {}) {
  const onSend = vi.fn();
  const onCancel = vi.fn();
  const onAttachmentsChange = vi.fn();
  render(
    <MessageComposer
      onSend={onSend}
      onCancel={onCancel}
      busy={false}
      attachments={[]}
      onAttachmentsChange={onAttachmentsChange}
      {...overrides}
    />,
  );
  return {
    onSend,
    onCancel,
    onAttachmentsChange,
    textarea: screen.getByRole("textbox", { name: /message/i }),
  };
}

describe("MessageComposer keyboard handling", () => {
  it("sends on Enter", async () => {
    const user = userEvent.setup();
    const { onSend, textarea } = setup();
    await user.type(textarea, "hello");
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("hello", []);
  });

  it("inserts a newline on Shift+Enter instead of sending", async () => {
    const user = userEvent.setup();
    const { onSend, textarea } = setup();
    await user.type(textarea, "line one");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    await user.type(textarea, "line two");
    expect(onSend).not.toHaveBeenCalled();
    expect((textarea as HTMLTextAreaElement).value).toContain("\n");
  });

  it("does not send on Enter while an IME composition is open", () => {
    const { onSend, textarea } = setup();
    fireEvent.change(textarea, { target: { value: "にほんご" } });
    fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("sends on Enter once the composition has ended", () => {
    const { onSend, textarea } = setup();
    fireEvent.change(textarea, { target: { value: "にほんご" } });
    fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });
    fireEvent.keyDown(textarea, { key: "Enter", isComposing: false });
    expect(onSend).toHaveBeenCalledWith("にほんご", []);
  });

  it("cancels an in-flight reply on Escape", () => {
    const { onCancel, textarea } = setup({ busy: true });
    fireEvent.keyDown(textarea, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape when nothing is in flight", () => {
    const { onCancel, textarea } = setup();
    fireEvent.keyDown(textarea, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("refuses to send whitespace", async () => {
    const user = userEvent.setup();
    const { onSend, textarea } = setup();
    await user.type(textarea, "   ");
    await user.keyboard("{Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("trims the message before sending", async () => {
    const user = userEvent.setup();
    const { onSend, textarea } = setup();
    await user.type(textarea, "  padded  ");
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("padded", []);
  });

  it("clears the draft after a send", async () => {
    const user = userEvent.setup();
    const { textarea } = setup();
    await user.type(textarea, "hello");
    await user.keyboard("{Enter}");
    expect((textarea as HTMLTextAreaElement).value).toBe("");
  });
});

describe("MessageComposer while a reply is streaming", () => {
  it("leaves the textarea usable so the next message can be drafted", async () => {
    const user = userEvent.setup();
    const { textarea } = setup({ busy: true });
    expect(textarea).toBeEnabled();
    await user.type(textarea, "next question");
    expect((textarea as HTMLTextAreaElement).value).toBe("next question");
  });

  it("swaps Send for Stop", () => {
    setup({ busy: true });
    expect(screen.getByRole("button", { name: /stop replying/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send message/i })).toBeNull();
  });

  it("will not send while busy, even on Enter", async () => {
    const user = userEvent.setup();
    const { onSend, textarea } = setup({ busy: true });
    await user.type(textarea, "too soon");
    await user.keyboard("{Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("tells the user how to interrupt", () => {
    setup({ busy: true });
    expect(screen.getByText(/press Escape or Stop/i)).toBeInTheDocument();
  });
});

describe("MessageComposer send button", () => {
  it("is disabled until there is something to send", async () => {
    const user = userEvent.setup();
    const { textarea } = setup();
    expect(screen.getByRole("button", { name: /send message/i })).toBeDisabled();
    await user.type(textarea, "x");
    expect(screen.getByRole("button", { name: /send message/i })).toBeEnabled();
  });
});
