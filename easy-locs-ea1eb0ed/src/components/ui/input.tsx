import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full min-w-0 border border-input bg-background px-3 text-base leading-tight sm:text-sm text-foreground",
          "placeholder:text-muted-foreground placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:border-ring/40 focus-visible:shadow-[0_0_0_4px_hsl(var(--ring)/0.08)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200 ease-[var(--ease-silk)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "h-[var(--input-height)] rounded-[var(--input-radius)] appearance-none",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
