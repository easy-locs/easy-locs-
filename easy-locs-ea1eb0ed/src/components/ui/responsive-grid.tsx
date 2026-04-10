import { cn } from "@/lib/utils";

interface ResponsiveGridProps {
  children: React.ReactNode;
  minChildWidth?: string;
  className?: string;
  variant?: "default" | "stats" | "cards" | "compact";
  cols?: 1 | 2 | 3 | 4;
}

const VARIANT_STYLES: Record<string, string> = {
  default: "responsive-card-grid",
  stats: "stat-grid",
  cards: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
  compact: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2",
};

const COL_STYLES: Record<number, string> = {
  1: "grid grid-cols-1 gap-3",
  2: "grid grid-cols-1 sm:grid-cols-2 gap-3",
  3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
  4: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3",
};

const ResponsiveGrid = ({
  children,
  minChildWidth,
  className,
  variant = "default",
  cols,
}: ResponsiveGridProps) => {
  if (cols) {
    return <div className={cn(COL_STYLES[cols], className)}>{children}</div>;
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

  return <div className={cn(VARIANT_STYLES[variant], className)}>{children}</div>;
};

export { ResponsiveGrid };
export type { ResponsiveGridProps };
