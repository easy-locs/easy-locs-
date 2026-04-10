import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/60",
        className,
      )}
      {...props}
    />
  );
}

function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3 rounded", i === lines - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/15 bg-card p-4 space-y-3", className)}>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-3 w-1/2 rounded" />
    </div>
  );
}

function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center p-3 rounded-2xl border border-border/10 bg-card">
          <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3 rounded" />
            <Skeleton className="h-2.5 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonAvatar({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeMap = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-14 w-14" };
  return <Skeleton className={cn("rounded-full", sizeMap[size], className)} />;
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonList, SkeletonAvatar };
