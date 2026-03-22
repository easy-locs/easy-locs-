import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useUltraFast } from "@/lib/performance/useUltraFast";

interface UltraButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hapticType?: "light" | "success" | "error";
}

const UltraButton = forwardRef<HTMLButtonElement, UltraButtonProps>(
  ({ children, onClick, className, hapticType = "light", ...props }, ref) => {
    const { haptic } = useUltraFast();

    return (
      <button
        ref={ref}
        onClick={(e) => {
          haptic(hapticType);
          onClick?.(e);
        }}
        className={cn(
          "active:scale-[0.96] transition-transform duration-75 will-change-transform",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
UltraButton.displayName = "UltraButton";

export default UltraButton;
export { UltraButton };
