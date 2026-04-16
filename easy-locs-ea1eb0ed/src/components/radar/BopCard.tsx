import * as React from "react";
import { cn } from "@/lib/utils";
import { AppCard } from "@/components/ui/AppCard";
import { Inbox } from "lucide-react";

const BOP_ICON_SIZE = "w-9 h-9";
const BOP_INNER_ICON_SIZE = "w-4 h-4";
const BOP_ACTION_SIZE = "w-8 h-8";
const BOP_ACTION_ICON_SIZE = "w-3.5 h-3.5";

interface BopCardProps {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  highlight?: boolean;
}

function BopCard({ onClick, className, children, highlight }: BopCardProps) {
  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }
    : undefined;

  return (
    <AppCard
      variant="interactive"
      padding="none"
      status={highlight ? "active" : undefined}
      className={cn("flex items-center gap-3 p-3 group relative", className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      {children}
    </AppCard>
  );
}

function BopCardIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(BOP_ICON_SIZE, "rounded-xl flex items-center justify-center shrink-0", className)}>
      {children}
    </div>
  );
}

function BopCardContent({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 min-w-0">{children}</div>;
}

function BopCardTitle({ children, badge }: { children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs font-bold text-foreground line-clamp-1 leading-snug min-w-0 flex-1">{children}</span>
      {badge}
    </div>
  );
}

function BopCardDescription({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.6875rem] text-muted-foreground mt-0.5 line-clamp-2 break-words leading-snug">
      {children}
    </p>
  );
}

function BopCardMeta({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 mt-1">{children}</div>;
}

function BopCardActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1.5 shrink-0">{children}</div>;
}

function BopCardActionButton({ icon, onClick, label }: { icon: React.ReactNode; onClick: (e: React.MouseEvent) => void; label: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      className={cn(BOP_ACTION_SIZE, "rounded-xl flex items-center justify-center active:scale-90 transition-transform bg-primary/10")}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

function BopBadge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "hot" | "gem" }) {
  const styles = {
    default: "bg-muted/20 text-muted-foreground border-border/20",
    hot: "bg-destructive/10 text-destructive",
    gem: "bg-purple-500/10 text-purple-600",
  };
  return (
    <span className={cn("shrink-0 text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full", styles[variant])}>
      {children}
    </span>
  );
}

function BopModuleBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-[0.625rem] font-medium px-1.5 py-0.5 rounded-full border", className)}>
      {children}
    </span>
  );
}

function BopCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-border/8 bg-card">
          <div className={cn(BOP_ICON_SIZE, "rounded-xl skeleton-premium shrink-0")} />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded-md skeleton-premium" />
            <div className="h-2.5 w-1/2 rounded-md skeleton-premium" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BopEmptyState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-muted/30">
        <Inbox className="h-5 w-5 opacity-30" />
      </div>
      <p className="text-xs font-semibold opacity-50">
        {message || "Nothing here yet"}
      </p>
    </div>
  );
}

export {
  BopCard,
  BopCardIcon,
  BopCardContent,
  BopCardTitle,
  BopCardDescription,
  BopCardMeta,
  BopCardActions,
  BopCardActionButton,
  BopBadge,
  BopModuleBadge,
  BopCardSkeleton,
  BopEmptyState,
  BOP_ICON_SIZE,
  BOP_INNER_ICON_SIZE,
  BOP_ACTION_ICON_SIZE,
};
