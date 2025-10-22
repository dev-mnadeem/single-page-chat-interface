import { useCallback, useState } from "react";
import type { Attachment, ChatOptions } from "./types";
import type { ChatProvider } from "./lib/providers";
import { DEFAULT_OPTIONS } from "./types";
import { toMeta } from "./lib/attachments";
import { toMarkdown, transcriptFilename } from "./lib/transcript";
import { useChat } from "./lib/chat/useChat";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { MessageComposer } from "./components/MessageComposer";

export interface AppProps {
  /**
   * Overrides the provider chosen by `src/config.ts`. Production never passes
   * one; tests do, so the whole screen can be driven end to end without a
   * timer and without a network.
   */
  provider?: ChatProvider;
}

/**
 * The shell. It owns only the two pieces of state that are not part of a turn
 * - the request options and the staged attachments - and delegates everything
 * about the conversation itself to `useChat`.
 */
function App({ provider }: AppProps = {}) {
  const [options, setOptions] = useState<ChatOptions>(DEFAULT_OPTIONS);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const chat = useChat({ provider });

  const send = useCallback(
    (prompt: string, staged: Attachment[]) => {
      chat.send(prompt, options, toMeta(staged));
    },
    [chat, options],
  );

  const exportTranscript = useCallback(() => {
    const blob = new Blob([toMarkdown(chat.messages)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = transcriptFilename(new Date());
    link.click();
    URL.revokeObjectURL(url);
  }, [chat.messages]);

  const startOver = useCallback(() => {
    chat.reset();
    setAttachments([]);
  }, [chat]);

  return (
    <div className="flex h-full flex-col bg-canvas">
      <ChatHeader
        options={options}
        onOptionsChange={setOptions}
        providerLabel={chat.providerLabel}
        providerOffline={chat.providerOffline}
        canExport={chat.messages.length > 0}
        onExport={exportTranscript}
        onReset={startOver}
      />

      <MessageList
        messages={chat.messages}
        phase={chat.phase}
        providerLabel={chat.providerLabel}
        onRetry={() => chat.retry(options)}
        onSuggestion={(prompt) => send(prompt, [])}
      />

      <MessageComposer
        onSend={send}
        onCancel={chat.cancel}
        busy={chat.busy}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
      />
    </div>
  );
}

export default App;
