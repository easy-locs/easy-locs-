import { cn } from "@/lib/utils";

export function ShimmerSkeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-xl", className)} />;
}
