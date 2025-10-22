import React from "react";
import { Bot, Download, Plus, WifiOff } from "lucide-react";
import type { ChatOptions } from "../types";
import { Button } from "./ui/button";
import { OptionsPanel } from "./OptionsPanel";

interface ChatHeaderProps {
  options: ChatOptions;
  onOptionsChange: (options: ChatOptions) => void;
  providerLabel: string;
  providerOffline: boolean;
  canExport: boolean;
  onExport: () => void;
  onReset: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  options,
  onOptionsChange,
  providerLabel,
  providerOffline,
  canExport,
  onExport,
  onReset,
}) => (
  <header className="shrink-0 border-b border-hairline bg-surface/85 backdrop-blur">
    <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
        <Bot className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold leading-tight text-ink">
          Chat interface
        </h1>
        <p className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
          {providerOffline && <WifiOff className="h-3 w-3" aria-hidden />}
          {providerLabel}
        </p>
      </div>

      <Button variant="ghost" size="sm" onClick={onExport} disabled={!canExport}>
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Export</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={onReset} disabled={!canExport}>
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">New chat</span>
      </Button>
      <OptionsPanel options={options} onOptionsChange={onOptionsChange} />
    </div>
  </header>
);
