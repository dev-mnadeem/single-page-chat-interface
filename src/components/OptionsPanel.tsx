import React from "react";
import { Settings2 } from "lucide-react";
import type { ChatOptions } from "../types";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

/**
 * Every control here is declared as data so the panel, the type and the
 * scripted composer cannot drift apart: adding a tone means adding one entry
 * to `TONES` and one opener in `src/lib/script/composer.ts`.
 */
const LENGTHS: ReadonlyArray<[ChatOptions["responseLength"], string]> = [
  ["short", "Short - one idea"],
  ["medium", "Medium - a few paragraphs"],
  ["long", "Long - with the trade-offs"],
];

const MODELS: ReadonlyArray<[ChatOptions["model"], string]> = [
  ["gpt-4", "GPT-4"],
  ["gpt-3.5-turbo", "GPT-3.5 Turbo"],
  ["claude-3", "Claude 3"],
  ["gemini-pro", "Gemini Pro"],
];

const TONES: ReadonlyArray<[ChatOptions["tone"], string]> = [
  ["professional", "Professional"],
  ["casual", "Casual"],
  ["friendly", "Friendly"],
  ["technical", "Technical"],
];

const READING_LEVELS: ReadonlyArray<[ChatOptions["readingLevel"], string]> = [
  ["beginner", "Beginner"],
  ["intermediate", "Intermediate"],
  ["advanced", "Advanced"],
];

const TEMPERATURE_STEP = 0.1;

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <div className="space-y-1.5">
    <div className="flex items-baseline justify-between gap-3">
      <label className="text-[12.5px] font-medium text-ink">{label}</label>
      {hint && <span className="text-[11px] tabular-nums text-ink-muted">{hint}</span>}
    </div>
    {children}
  </div>
);

interface OptionsPanelProps {
  options: ChatOptions;
  onOptionsChange: (options: ChatOptions) => void;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({ options, onOptionsChange }) => {
  const set = <K extends keyof ChatOptions>(key: K, value: ChatOptions[K]) =>
    onOptionsChange({ ...options, [key]: value });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Options</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request options</DialogTitle>
          <DialogDescription>
            These are applied to the next turn. With the local provider they change the scripted
            answer directly, so the effect is visible immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Response length">
            <Select
              value={options.responseLength}
              onChange={(event) =>
                set("responseLength", event.target.value as ChatOptions["responseLength"])
              }
            >
              {LENGTHS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Model">
            <Select
              value={options.model}
              onChange={(event) => set("model", event.target.value as ChatOptions["model"])}
            >
              {MODELS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tone">
            <Select
              value={options.tone}
              onChange={(event) => set("tone", event.target.value as ChatOptions["tone"])}
            >
              {TONES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Reading level">
            <Select
              value={options.readingLevel}
              onChange={(event) =>
                set("readingLevel", event.target.value as ChatOptions["readingLevel"])
              }
            >
              {READING_LEVELS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Temperature" hint={options.temperature.toFixed(1)}>
            <Slider
              value={options.temperature}
              step={TEMPERATURE_STEP}
              onChange={(event) => set("temperature", Number(event.target.value))}
              aria-label="Temperature"
            />
            <p className="text-[11px] text-ink-muted">
              Widens the pool of phrasings the local provider draws from. At 0 the answer is
              fixed.
            </p>
          </Field>

          <div className="flex items-start justify-between gap-4 border-t border-hairline pt-4">
            <div>
              <p className="text-[12.5px] font-medium text-ink">Include outline</p>
              <p className="text-[11px] text-ink-muted">
                Appends a key-points list to prose answers.
              </p>
            </div>
            <Switch
              checked={options.includeOutline}
              onCheckedChange={(checked) => set("includeOutline", checked)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
