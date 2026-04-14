import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex w-full min-h-[5rem] border border-input bg-background px-3 py-2.5 text-base sm:text-sm text-foreground",
        "placeholder:text-muted-foreground placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:border-ring/40 focus-visible:shadow-[0_0_0_4px_hsl(var(--ring)/0.08)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-all duration-200 ease-[var(--ease-silk)] resize-vertical",
        "rounded-[var(--input-radius)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
