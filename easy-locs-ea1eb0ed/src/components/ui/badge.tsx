import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex min-w-fit items-center justify-center whitespace-nowrap rounded-full border px-2.5 h-6 text-xs leading-none font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary:   "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/12 text-destructive shadow-[0_0_6px_hsl(var(--destructive)/0.1)]",
        outline:     "text-foreground border-border/60",
        success:     "border-transparent bg-success/12 text-success shadow-[0_0_6px_hsl(var(--success)/0.1)]",
        warning:     "border-transparent bg-warning/12 text-warning shadow-[0_0_6px_hsl(var(--warning)/0.1)]",
        info:        "border-transparent bg-info/12 text-info shadow-[0_0_6px_hsl(var(--info)/0.1)]",
        premium:     "border-transparent bg-gold/12 text-gold-dark shadow-[0_0_6px_hsl(var(--gold)/0.1)]",
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
