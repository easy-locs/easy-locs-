import * as React from "react";
import { cn } from "@/lib/utils";

interface AppTextProps extends React.HTMLAttributes<HTMLElement> {
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  lines?: 1 | 2 | 3 | "free";
  muted?: boolean;
  size?: "xs" | "sm" | "base" | "lg";
}

const SIZE_CLASS: Record<string, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

const LINE_CLASS: Record<string, string> = {
  1: "text-1-line",
  2: "text-2-lines",
  3: "text-3-lines",
  free: "break-words min-w-0",
};

export const AppText = React.forwardRef<HTMLElement, AppTextProps>(
  ({ as: Tag = "p", lines = "free", muted = false, size = "sm", className, children, ...props }, ref) => {
    const lineClass = LINE_CLASS[String(lines)] ?? LINE_CLASS.free;
    const sizeClass = SIZE_CLASS[size] ?? SIZE_CLASS.sm;

    return React.createElement(
      Tag,
      {
        ref,
        className: cn(
          sizeClass,
          lineClass,
          muted && "text-muted-foreground",
          className,
        ),
        ...props,
      },
      children ?? null,
    );
  },
);
AppText.displayName = "AppText";

interface AppCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  lines?: 1 | 2;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export const AppCardTitle = React.forwardRef<HTMLHeadingElement, AppCardTitleProps>(
  ({ lines = 2, as: Tag = "h3", className, children, ...props }, ref) => {
    return React.createElement(
      Tag,
      {
        ref,
        className: cn(
          "text-sm font-semibold leading-snug tracking-tight",
          lines === 1 ? "text-1-line" : "text-2-lines",
          className,
        ),
        ...props,
      },
      children ?? null,
    );
  },
);
AppCardTitle.displayName = "AppCardTitle";

export const CardTitle = AppCardTitle;

interface LabelTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  maxLines?: 1 | 2;
}

export const LabelText = React.forwardRef<HTMLSpanElement, LabelTextProps>(
  ({ maxLines = 1, className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "text-label-safe",
          maxLines === 2 && "whitespace-normal",
          className,
        )}
        {...props}
      >
        {children ?? null}
      </span>
    );
  },
);
LabelText.displayName = "LabelText";
