/**
 * ShimmerSkeleton — Premium loading skeleton with shimmer animation.
 */
import { cn } from "@/lib/utils";

export function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl bg-muted/40",
      "before:absolute before:inset-0 before:-translate-x-full",
      "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
      "before:animate-[shimmer_2s_infinite]",
      className
    )} />
  );
}
