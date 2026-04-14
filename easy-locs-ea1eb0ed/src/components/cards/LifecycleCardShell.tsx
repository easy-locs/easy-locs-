/**
 * LifecycleCardShell — Universal lifecycle wrapper for card sections.
 * Handles loading/empty/error/live states with premium visual feedback.
 * Does NOT handle visual styling — that's the card component's job.
 */
import type { ReactNode } from "react";
import type { CardStatus } from "@/domains/cards/card-contract";
import { Loader2, Inbox, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type CardState = CardStatus;

interface LifecycleCardShellProps {
  state: CardState;
  title?: string;
  children: ReactNode;
  onRetry?: () => void;
  className?: string;
  /** Number of skeleton items for loading state */
  skeletonCount?: number;
}

function SkeletonCards({ count = 3 }: { count: number }) {
  return (
    <div className="flex gap-3 overflow-hidden pb-2 px-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="shrink-0 w-[170px] rounded-2xl border border-border/10 bg-card overflow-hidden shadow-card">
          <div className="aspect-[16/10] w-full skeleton-premium" />
          <div className="p-3 space-y-2.5">
            <div className="h-3.5 w-3/4 rounded-md skeleton-premium" />
            <div className="h-2.5 w-1/2 rounded-md skeleton-premium" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title }: { title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        <Inbox className="h-5 w-5 opacity-30" />
      </div>
      <p className="text-xs font-semibold opacity-50">
        {title ? `No ${title.toLowerCase()} yet` : "Nothing here yet"}
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 rounded-2xl" style={{ background: "hsl(var(--destructive) / 0.04)", border: "1px solid hsl(var(--destructive) / 0.08)" }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "hsl(var(--destructive) / 0.08)" }}>
        <AlertCircle className="h-5 w-5" style={{ color: "hsl(var(--destructive) / 0.6)" }} />
      </div>
      <p className="text-xs font-semibold text-foreground/70">Something went wrong</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-xs font-bold px-4 py-2 rounded-lg active:scale-95 transition-transform"
          style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function LifecycleCardShell({
  state,
  title,
  children,
  onRetry,
  className,
  skeletonCount = 3,
}: LifecycleCardShellProps) {
  if (state === "loading") return <div className={cn("min-w-0", className)}><SkeletonCards count={skeletonCount} /></div>;
  if (state === "empty") return <div className={cn("min-w-0", className)}><EmptyState title={title} /></div>;
  if (state === "error") return <div className={cn("min-w-0", className)}><ErrorState onRetry={onRetry} /></div>;
  if (state === "disabled") return null;
  return <div className={cn("min-w-0", className)}>{children ?? null}</div>;
}
