import { cn } from "@/lib/utils";

interface ResponsiveGridProps {
  children: React.ReactNode;
  /** Minimum child width before wrapping (default: 280px) */
  minChildWidth?: string;
  /** Gap override */
  className?: string;
  /** Use stat-grid layout (smaller items) */
  variant?: "default" | "stats";
}

/**
 * ResponsiveGrid — Auto-fit grid that adapts to any screen width.
 * Replaces repetitive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` patterns.
 */
const ResponsiveGrid = ({
  children,
  minChildWidth,
  className,
  variant = "default",
}: ResponsiveGridProps) => {
  if (variant === "stats") {
    return <div className={cn("stat-grid", className)}>{children}</div>;
  }

  if (minChildWidth) {
    return (
      <div
        className={cn("grid", className)}
        style={{
          gap: "var(--card-gap)",
          gridTemplateColumns: `repeat(auto-fill, minmax(min(${minChildWidth}, 100%), 1fr))`,
        }}
      >
        {children}
      </div>
    );
  }

  return <div className={cn("responsive-card-grid", className)}>{children}</div>;
};

export { ResponsiveGrid };
export type { ResponsiveGridProps };
