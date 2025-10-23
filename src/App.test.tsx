import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import type { ChatDelta, ChatProvider, ChatTurnRequest } from "./lib/providers";
import { ProviderError, abortableDelay, createScriptedProvider } from "./lib/providers";

/** A provider that emits fixed deltas, so the assertions are exact. */
function stubProvider(chunks: string[], delayMs = 0): ChatProvider {
  return {
    id: "stub",
    label: "Stub provider",
    offline: true,
    async *stream(_request: ChatTurnRequest, signal: AbortSignal): AsyncIterable<ChatDelta> {
      for (const text of chunks) {
        await abortableDelay(delayMs, signal);
        yield { text };
      }
    },
  };
}

function failingProvider(error: Error): ChatProvider {
  return {
    id: "broken",
    label: "Broken provider",
    offline: false,
    // eslint-disable-next-line require-yield
    async *stream(): AsyncIterable<ChatDelta> {
      throw error;
    },
  };
}

async function sendMessage(user: ReturnType<typeof userEvent.setup>, text: string) {
  const textarea = screen.getByRole("textbox", { name: /message/i });
  await user.type(textarea, text);
  await user.click(screen.getByRole("button", { name: /send message/i }));
}

describe("App", () => {
  it("opens on an empty state with suggested prompts", () => {
    render(<App provider={stubProvider(["hi"])} />);
    expect(screen.getByRole("heading", { name: /start a conversation/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /what is a provider interface/i }),
    ).toBeInTheDocument();
  });

  it("shows the user message and the streamed reply", async () => {
    const user = userEvent.setup();
    render(<App provider={stubProvider(["Hello ", "there!"])} />);

    await sendMessage(user, "who are you");

    expect(await screen.findByText("who are you")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Hello there!")).toBeInTheDocument());
  });

  it("sends the prompt when a suggestion is clicked", async () => {
    const user = userEvent.setup();
    render(<App provider={stubProvider(["ok"])} />);
    await user.click(
      screen.getByRole("button", { name: /show me code for injecting a clock/i }),
    );
    expect(await screen.findByText("Show me code for injecting a clock")).toBeInTheDocument();
  });

  it("keeps the partial answer when the user stops a stream", async () => {
    const user = userEvent.setup();
    render(<App provider={stubProvider(["first ", "second ", "third"], 30)} />);

    await sendMessage(user, "long answer please");
    const stop = await screen.findByRole("button", { name: /stop replying/i });
    await waitFor(() => expect(screen.getByText(/first/)).toBeInTheDocument());
    await user.click(stop);

    expect(await screen.findByText(/stopped/i)).toBeInTheDocument();
    // The remaining chunks must never appear after the stop.
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(screen.queryByText(/third/)).toBeNull();
  });

  it("reports a provider failure and offers a retry", async () => {
    const user = userEvent.setup();
    render(<App provider={failingProvider(new ProviderError("network", "down"))} />);

    await sendMessage(user, "anything");

    // The failure is reported once, inside the assistant bubble that failed,
    // rather than in a separate banner that repeats it.
    const bubble = await screen.findByLabelText("Assistant message");
    expect(bubble).toHaveTextContent(/could not reach the chat service/i);
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("renders a code block from the scripted provider", async () => {
    const user = userEvent.setup();
    render(<App provider={createScriptedProvider({ chunkDelayMs: 0 })} />);

    await sendMessage(user, "show me code for a clock");

    expect(await screen.findByText("typescript")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy code/i })).toBeInTheDocument();
  });

  it("names the local provider in the header", () => {
    render(<App provider={createScriptedProvider({ chunkDelayMs: 0 })} />);
    expect(screen.getByText(/local scripted assistant/i)).toBeInTheDocument();
  });

  it("enables export and new chat only once there is a conversation", async () => {
    const user = userEvent.setup();
    render(<App provider={stubProvider(["ok"])} />);

    expect(screen.getByRole("button", { name: /export/i })).toBeDisabled();
    await sendMessage(user, "hello");
    await waitFor(() => expect(screen.getByRole("button", { name: /export/i })).toBeEnabled());
  });

  it("clears the transcript on new chat", async () => {
    const user = userEvent.setup();
    render(<App provider={stubProvider(["ok"])} />);

    await sendMessage(user, "hello");
    await screen.findByText("hello");
    await user.click(screen.getByRole("button", { name: /new chat/i }));

    expect(screen.queryByText("hello")).toBeNull();
    expect(screen.getByRole("heading", { name: /start a conversation/i })).toBeInTheDocument();
  });

  it("restores the previous conversation from storage on mount", async () => {
    const user = userEvent.setup();
    const first = render(<App provider={stubProvider(["saved reply"])} />);
    await sendMessage(user, "remember me");
    await waitFor(() => expect(screen.getByText("saved reply")).toBeInTheDocument());
    first.unmount();

    render(<App provider={stubProvider(["unused"])} />);
    expect(await screen.findByText("remember me")).toBeInTheDocument();
  });

  it("changes the answer when the tone option changes", async () => {
    const user = userEvent.setup();
    const provider = createScriptedProvider({ chunkDelayMs: 0 });

    const first = render(<App provider={provider} />);
    await sendMessage(user, "what is a seam");
    const friendly = (await screen.findByLabelText("Assistant message")).textContent ?? "";
    first.unmount();
    localStorage.clear();

    render(<App provider={provider} />);
    await user.click(screen.getByRole("button", { name: /options/i }));
    await user.selectOptions(await screen.findByDisplayValue(/friendly/i), "technical");
    await user.keyboard("{Escape}");
    await sendMessage(user, "what is a seam");
    const technical = (await screen.findByLabelText("Assistant message")).textContent ?? "";

    expect(technical).not.toBe(friendly);
  });

  it("does not reset the scroll position while the user reads history", async () => {
    // The jump-to-latest affordance only exists because auto-scroll is
    // conditional; its presence is the observable proof.
    const user = userEvent.setup();
    render(<App provider={stubProvider(["ok"])} />);
    await sendMessage(user, "hello");
    await screen.findByText("hello");

    const log = screen.getByRole("log");
    Object.defineProperty(log, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(log, "clientHeight", { value: 400, configurable: true });
    log.scrollTop = 0;
    log.dispatchEvent(new Event("scroll"));

    expect(await screen.findByRole("button", { name: /jump to latest/i })).toBeInTheDocument();
  });

  it("scrolls back down when jump to latest is clicked", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();
    render(<App provider={stubProvider(["ok"])} />);
    await sendMessage(user, "hello");
    await screen.findByText("hello");

    const log = screen.getByRole("log");
    log.scrollTo = scrollTo;
    Object.defineProperty(log, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(log, "clientHeight", { value: 400, configurable: true });
    log.scrollTop = 0;
    log.dispatchEvent(new Event("scroll"));

    await user.click(await screen.findByRole("button", { name: /jump to latest/i }));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 2000 }));
  });
});
