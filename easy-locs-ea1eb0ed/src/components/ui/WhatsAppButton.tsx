import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import WhatsAppIcon from "./WhatsAppIcon";
import { triggerHaptic } from "@/lib/whatsapp-utils";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline" | "ghost";
  iconOnly?: boolean;
  children?: ReactNode;
}

const sizeClasses = {
  sm: "h-9 px-3 text-xs gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-sm gap-2.5",
};

const iconOnlySizes = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

const iconSizes = {
  sm: 14,
  md: 16,
  lg: 18,
};

const variantClasses = {
  solid: "bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-sm active:scale-[0.97]",
  outline: "border border-[#25D366]/30 text-[#25D366] bg-[#25D366]/5 hover:bg-[#25D366]/15 active:scale-[0.97]",
  ghost: "text-[#25D366] hover:bg-[#25D366]/10 active:scale-[0.97]",
};

const WhatsAppButton = forwardRef<HTMLButtonElement, WhatsAppButtonProps>(
  ({ href, size = "md", variant = "outline", iconOnly = false, children, className, onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      triggerHaptic("medium");
      if (href) {
        window.open(href, "_blank", "noopener,noreferrer");
      }
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 min-h-[48px]",
          variantClasses[variant],
          iconOnly ? iconOnlySizes[size] : sizeClasses[size],
          className,
        )}
        {...props}
      >
        <WhatsAppIcon size={iconSizes[size]} />
        {!iconOnly && (children || "WhatsApp")}
      </button>
    );
  },
);

WhatsAppButton.displayName = "WhatsAppButton";
export default WhatsAppButton;
