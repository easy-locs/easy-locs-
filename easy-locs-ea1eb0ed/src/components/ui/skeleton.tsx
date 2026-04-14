import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md skeleton-premium",
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
    <div className={cn("rounded-2xl border border-border/10 bg-card p-4 space-y-3 shadow-[var(--shadow-premium-sm)]", className)}>
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

function SkeletonProfile({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center space-y-4 p-6", className)}>
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="space-y-2 w-full max-w-xs">
        <Skeleton className="h-4 w-2/3 mx-auto rounded" />
        <Skeleton className="h-3 w-1/2 mx-auto rounded" />
      </div>
      <div className="w-full space-y-3 mt-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4 rounded" />
            <Skeleton className="h-2.5 w-1/2 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3 rounded" />
            <Skeleton className="h-2.5 w-2/5 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-4/5 rounded" />
            <Skeleton className="h-2.5 w-1/3 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonChat({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-4 p-4", className)}>
      {Array.from({ length: count }).map((_, i) => {
        const isRight = i % 2 === 1;
        return (
          <div key={i} className={cn("flex gap-2.5", isRight ? "flex-row-reverse" : "flex-row")}>
            {!isRight && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
            <div className={cn("space-y-1.5 max-w-[70%]", isRight ? "items-end" : "items-start")}>
              <Skeleton className={cn("h-10 rounded-2xl", isRight ? "w-40" : "w-52")} />
              <Skeleton className="h-2 w-12 rounded" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkeletonGrid({ cols = 2, count = 4, className }: { cols?: number; count?: number; className?: string }) {
  return (
    <div className={cn(`grid gap-3`, cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-1", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonList, SkeletonAvatar, SkeletonProfile, SkeletonChat, SkeletonGrid };
