import * as React from "react";
import { cn } from "@/lib/utils";
import { Drawer } from "vaul";

interface AppBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  className?: string;
}

export function AppBottomSheet({ open, onOpenChange, title, children, snapPoints, className }: AppBottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} snapPoints={snapPoints}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50",
            "bg-card rounded-t-2xl border-t border-border/30",
            "flex flex-col max-h-[85dvh]",
            className,
          )}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          {title && (
            <div className="px-4 pb-3 pt-1">
              <Drawer.Title className="text-base font-semibold text-foreground">{title}</Drawer.Title>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
