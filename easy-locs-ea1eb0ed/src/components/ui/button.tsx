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
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.97] transition-all duration-150",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.97]",
        outline:
          "border border-input bg-background hover:bg-accent/8 hover:text-accent-foreground hover:border-accent/40 transition-all duration-150",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.97]",
        ghost:
          "hover:bg-accent/8 hover:text-accent-foreground transition-colors duration-150",
        link:
          "text-primary underline-offset-4 hover:underline",
        /* ── Premium gold CTA — strongest visual weight ── */
        premium:
          "bg-gradient-to-r from-gold to-gold-light text-accent-foreground shadow-gold hover:shadow-gold hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-200",
        /* ── Success (confirm, validate) ── */
        success:
          "bg-success text-success-foreground shadow-sm hover:bg-success/90 active:scale-[0.97]",
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
  loading?: boolean;
}

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
