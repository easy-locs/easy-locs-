/**
 * MapLoadingSkeleton — Shared loading skeleton for all map screens.
 * Provides consistent loading experience across Nearby, Delivery, Drivers, Order Tracking.
 */
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  /** Number of skeleton cards to show */
  cardCount?: number;
  /** Show a map placeholder */
  showMap?: boolean;
}

export default function MapLoadingSkeleton({ cardCount = 3, showMap = true }: Props) {
  return (
    <div className="space-y-3 px-3">
      {/* Map skeleton */}
      {showMap && (
        <Skeleton className="h-[280px] w-full rounded-2xl" />
      )}
      {/* Card skeletons */}
      {Array.from({ length: cardCount }).map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-card/40 animate-pulse border border-border/10 p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-2.5 w-3/5" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
