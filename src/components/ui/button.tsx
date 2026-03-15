import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 text-center font-semibold",
    "whitespace-nowrap ring-offset-background transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "max-w-full shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border border-input bg-background hover:bg-accent/10 hover:text-accent-foreground hover:border-accent/40",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.98]",
        ghost:
          "hover:bg-accent/10 hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        /* ── Premium gold CTA ── */
        premium:
          "bg-gradient-to-r from-gold to-gold-light text-accent-foreground shadow-gold hover:opacity-90 active:scale-[0.98]",
        /* ── Success (confirm, validate) ── */
        success:
          "bg-success text-success-foreground shadow-sm hover:bg-success/90 active:scale-[0.98]",
      },
      size: {
        default: "h-[var(--input-height)] px-4 py-2 text-sm rounded-[var(--btn-radius)]",
        sm:     "h-[var(--input-height-sm)] sm:min-h-0 min-h-[var(--touch-min)] px-3 py-1.5 text-xs rounded-[0.5rem]",
        lg:     "h-12 px-6 py-2.5 text-sm rounded-[var(--btn-radius)]",
        icon:   "h-[var(--input-height)] w-[var(--input-height)] rounded-[0.5rem] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
