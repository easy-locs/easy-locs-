import { memo } from "react";

interface WidgetSkeletonProps {
  height?: number;
  lines?: number;
  className?: string;
}

function WidgetSkeletonInner({ height = 120, lines = 3, className = "" }: WidgetSkeletonProps) {
  return (
    <div
      className={`rounded-2xl border border-border/10 bg-card p-4 ${className}`}
      style={{ minHeight: height }}
      aria-busy="true"
      aria-label="Loading widget"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-8 w-8 rounded-full skeleton-premium shrink-0" />
        <div className="h-4 w-32 rounded skeleton-premium" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded skeleton-premium mb-2"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

const WidgetSkeleton = memo(WidgetSkeletonInner);
export default WidgetSkeleton;
