import * as React from "react";
import { cn } from "../../lib/utils";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * A real toggle.
 *
 * The obvious shortcut - a native `<input type="checkbox">` styled with
 * `data-[state=checked]` selectors - never works, because a checkbox has no
 * `data-state` attribute for those selectors to match. This renders a button
 * with `role="switch"`, which is what assistive technology expects anyway.
 */
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-accent" : "bg-hairline",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[1.125rem]" : "translate-x-[0.1875rem]",
        )}
      />
    </button>
  ),
);
Switch.displayName = "Switch";

export { Switch };
