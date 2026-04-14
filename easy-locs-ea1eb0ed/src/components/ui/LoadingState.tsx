import { cn } from "@/lib/utils";
import { Skeleton, SkeletonCard, SkeletonList, SkeletonProfile, SkeletonChat } from "@/components/ui/skeleton";

interface LoadingStateProps {
  rows?: number;
  className?: string;
  variant?: "cards" | "list" | "page" | "inline" | "profile" | "chat";
}

const LoadingState = ({ className, variant = "cards", rows = 3 }: LoadingStateProps) => {
  if (variant === "list") {
    return <SkeletonList count={rows} className={className} />;
  }

  if (variant === "page") {
    return (
      <div className={cn("space-y-4 p-4", className)}>
        <Skeleton className="h-6 w-1/3 rounded" />
        <Skeleton className="h-3 w-2/3 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "profile") {
    return <SkeletonProfile className={className} />;
  }

  if (variant === "chat") {
    return <SkeletonChat count={rows} className={className} />;
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-3 py-4 justify-center animate-slide-up-fade", className)}>
        <div className="h-5 w-5 rounded-full border-2 border-primary/60 border-t-transparent animate-spin shadow-[0_0_8px_hsl(var(--primary)/0.15)]" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export { LoadingState };
export type { LoadingStateProps };
