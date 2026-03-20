/**
 * LoadingState — Skeleton-based loading indicator for pages/sections.
 */
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  rows?: number;
  className?: string;
  variant?: "cards" | "list" | "page";
}

const LoadingState = ({ rows = 3, className, variant = "cards" }: LoadingStateProps) => {
  if (variant === "page") {
    return (
      <div className={cn("max-w-md mx-auto px-4 py-6 space-y-4", className)}>
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-4 w-64 rounded-lg" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
};

export { LoadingState };
export type { LoadingStateProps };
