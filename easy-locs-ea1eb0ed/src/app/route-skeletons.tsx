import type { ReactNode } from "react";

export function RouteLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg skeleton-premium" />
      <div className="h-4 w-72 rounded skeleton-premium" />
      <div className="h-40 w-full rounded-2xl skeleton-premium" />
      <div className="h-4 w-56 rounded skeleton-premium" />
      <div className="h-32 w-full rounded-2xl skeleton-premium" />
    </div>
  );
}

export function PillarSkeleton({ pillar }: { pillar: "dashboard" | "radar" | "orbit" | "wallet" | "me" }) {
  const skeletons: Record<string, ReactNode> = {
    dashboard: (
      <div className="flex flex-col gap-4 p-4 animate-pulse">
        <div className="h-8 w-40 rounded-lg skeleton-premium" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-xl skeleton-premium" />
          <div className="h-24 rounded-xl skeleton-premium" />
        </div>
        <div className="h-48 w-full rounded-2xl skeleton-premium" />
        <div className="h-32 w-full rounded-2xl skeleton-premium" />
      </div>
    ),
    radar: (
      <div className="flex flex-col gap-4 p-4 animate-pulse">
        <div className="h-10 w-full rounded-xl skeleton-premium" />
        <div className="h-48 w-full rounded-2xl skeleton-premium" />
        <div className="flex gap-3">
          <div className="h-28 w-28 rounded-xl skeleton-premium flex-shrink-0" />
          <div className="h-28 w-28 rounded-xl skeleton-premium flex-shrink-0" />
          <div className="h-28 w-28 rounded-xl skeleton-premium flex-shrink-0" />
        </div>
      </div>
    ),
    orbit: (
      <div className="flex flex-col gap-3 p-4 animate-pulse">
        <div className="h-8 w-32 rounded-lg skeleton-premium" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full skeleton-premium" />
            <div className="flex-1">
              <div className="h-4 w-32 rounded skeleton-premium mb-2" />
              <div className="h-3 w-48 rounded skeleton-premium" />
            </div>
          </div>
        ))}
      </div>
    ),
    wallet: (
      <div className="flex flex-col gap-4 p-4 animate-pulse">
        <div className="h-32 w-full rounded-2xl skeleton-premium" />
        <div className="flex gap-3 justify-center">
          <div className="h-12 w-20 rounded-xl skeleton-premium" />
          <div className="h-12 w-20 rounded-xl skeleton-premium" />
          <div className="h-12 w-20 rounded-xl skeleton-premium" />
        </div>
        <div className="h-40 w-full rounded-2xl skeleton-premium" />
      </div>
    ),
    me: (
      <div className="flex flex-col gap-4 p-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full skeleton-premium" />
          <div>
            <div className="h-5 w-32 rounded skeleton-premium mb-2" />
            <div className="h-3 w-24 rounded skeleton-premium" />
          </div>
        </div>
        <div className="h-24 w-full rounded-2xl skeleton-premium" />
        <div className="h-24 w-full rounded-2xl skeleton-premium" />
      </div>
    ),
  };
  return <>{skeletons[pillar] ?? <RouteLoadingSkeleton />}</>;
}
