import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex min-w-fit items-center justify-center whitespace-nowrap rounded-full border px-2.5 h-6 text-xs leading-none font-medium transition-colors",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-primary text-primary-foreground",
        secondary:   "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        outline:     "text-foreground border-border",
        success:     "border-transparent bg-success/10 text-success",
        warning:     "border-transparent bg-warning/10 text-warning",
        info:        "border-transparent bg-info/10 text-info",
        premium:     "border-transparent bg-gold/10 text-gold-dark",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
