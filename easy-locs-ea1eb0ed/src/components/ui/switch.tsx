// @ts-nocheck
import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";
import type { RadixPropsExtension } from "@/lib/ui-types";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & RadixPropsExtension
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-all duration-300 ease-in-out",
      "data-[state=checked]:bg-primary data-[state=checked]:border-primary/20",
      "data-[state=unchecked]:bg-muted/60 data-[state=unchecked]:border-border/15",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "active:scale-[0.97]",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full shadow-md ring-0 transition-all duration-300 ease-in-out",
        "data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-white data-[state=checked]:shadow-lg",
        "data-[state=unchecked]:translate-x-[3px] data-[state=unchecked]:bg-muted-foreground/50",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
