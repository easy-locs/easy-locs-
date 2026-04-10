import * as React from "react";
import { cn } from "@/lib/utils";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
}

interface QuickActionGridProps {
  actions: QuickAction[];
  columns?: 3 | 4;
  className?: string;
}

export function QuickActionGrid({ actions, columns = 4, className }: QuickActionGridProps) {
  return (
    <div className={cn(
      "grid gap-2",
      columns === 3 ? "grid-cols-3" : "grid-cols-4",
      className,
    )}>
      {actions.map((a, i) => (
        <button
          key={i}
          type="button"
          onClick={a.onClick}
          className={cn(
            "flex flex-col items-center gap-1.5 py-3 rounded-2xl",
            "active:scale-[0.96] transition-all duration-100",
            a.accent
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-foreground hover:bg-muted",
          )}
        >
          <span className="[&_svg]:w-5 [&_svg]:h-5 shrink-0">{a.icon}</span>
          <span className="text-[10px] font-semibold leading-snug whitespace-normal break-words text-center max-w-full px-1">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
