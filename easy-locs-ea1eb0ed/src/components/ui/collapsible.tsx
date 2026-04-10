// @ts-nocheck
import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import type { RadixPropsExtension } from "@/lib/ui-types";

const Collapsible = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root> & RadixPropsExtension
>(({ ...props }, ref) => <CollapsiblePrimitive.Root ref={ref} {...props} />);
Collapsible.displayName = "Collapsible";

const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleTrigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleTrigger> & RadixPropsExtension & { asChild?: boolean }
>(({ ...props }, ref) => <CollapsiblePrimitive.CollapsibleTrigger ref={ref} {...props} />);
CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent> & RadixPropsExtension
>(({ ...props }, ref) => <CollapsiblePrimitive.CollapsibleContent ref={ref} {...props} />);
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
