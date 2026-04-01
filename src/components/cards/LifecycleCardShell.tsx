/**
 * LifecycleCardShell — Universal lifecycle wrapper for card sections.
 * Handles loading/empty/error/live states with premium visual feedback.
 * Does NOT handle visual styling — that's the card component's job.
 */
import type { ReactNode } from "react";
import type { CardStatus } from "@/domains/cards/card-contract";
import { Loader2, Inbox, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
        <div key={i} className="shrink-0 w-[170px] rounded-2xl border border-border/15 bg-card overflow-hidden">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title }: { title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <Inbox className="h-6 w-6 mb-2 opacity-40" />
      <p className="text-[11px] font-medium opacity-60">
        {title ? `No ${title.toLowerCase()} yet` : "Nothing here yet"}
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-destructive/70">
      <AlertCircle className="h-5 w-5 mb-2 opacity-60" />
      <p className="text-[11px] font-medium">Something went wrong</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-[10px] font-semibold text-primary active:opacity-70"
        >
          Retry
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
  if (state === "loading") return <div className={className}><SkeletonCards count={skeletonCount} /></div>;
  if (state === "empty") return <div className={className}><EmptyState title={title} /></div>;
  if (state === "error") return <div className={className}><ErrorState onRetry={onRetry} /></div>;
  if (state === "disabled") return null;
  return <div className={className}>{children}</div>;
}
