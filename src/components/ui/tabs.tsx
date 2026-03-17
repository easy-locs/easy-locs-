// @ts-nocheck
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";
import type { RadixPropsExtension } from "@/lib/ui-types";

export type TabsProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & RadixPropsExtension;
export type TabsListProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & RadixPropsExtension;
export type TabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & RadixPropsExtension;
export type TabsContentProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & RadixPropsExtension;

const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
  ({ className, ...props }, ref) => <TabsPrimitive.Root ref={ref} className={className} {...props} />,
);
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, TabsListProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "flex w-full min-w-0 max-w-full items-center gap-0.5 overflow-x-auto overflow-y-hidden whitespace-nowrap rounded-xl bg-muted/40 p-1 text-muted-foreground scrollbar-thin [-webkit-overflow-scrolling:touch]",
        className,
      )}
      {...props}
    />
  ),
);
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex min-h-[2.25rem] min-w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ring-offset-background transition-all duration-150 sm:px-3.5 sm:text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, TabsContentProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  ),
);
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
