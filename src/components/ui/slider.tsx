import * as React from "react";
import { cn, fillPercent } from "../../lib/utils";

export interface SliderProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value"
> {
  value: number;
  min?: number;
  max?: number;
}

const ACCENT = "#b45309";
const TRACK = "#efe8dd";

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, min = 0, max = 1, ...props }, ref) => {
    const percent = fillPercent(value, min, max);
    return (
      <input
        ref={ref}
        type="range"
        value={value}
        min={min}
        max={max}
        className={cn("range-amber w-full cursor-pointer", className)}
        style={{
          background: `linear-gradient(to right, ${ACCENT} ${percent}%, ${TRACK} ${percent}%)`,
        }}
        {...props}
      />
    );
  },
);
Slider.displayName = "Slider";

export { Slider };
