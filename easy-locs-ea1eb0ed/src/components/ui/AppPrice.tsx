import * as React from "react";
import { cn } from "@/lib/utils";

interface AppPriceProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | string;
  currency?: string;
  size?: "sm" | "md" | "lg" | "xl";
  muted?: boolean;
  strikethrough?: boolean;
}

const SIZE_MAP: Record<NonNullable<AppPriceProps["size"]>, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

const AppPrice = React.forwardRef<HTMLSpanElement, AppPriceProps>(
  ({ value, currency, size = "md", muted, strikethrough, className, ...props }, ref) => {
    const formatted = typeof value === "number"
      ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : value;

    return (
      <span
        ref={ref}
        className={cn(
          "font-bold tabular-nums whitespace-nowrap",
          SIZE_MAP[size],
          muted ? "text-muted-foreground" : "text-foreground",
          strikethrough && "line-through opacity-50",
          className,
        )}
        {...props}
      >
        {formatted}
        {currency && <span className="ml-0.5 text-[0.8em] font-medium">{currency}</span>}
      </span>
    );
  },
);
AppPrice.displayName = "AppPrice";

export { AppPrice };
export type { AppPriceProps };
