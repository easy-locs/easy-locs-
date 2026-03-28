/**
 * CardMedia — Image/thumbnail section with optional badge overlay.
 */
import { cn } from "@/lib/utils";

interface CardMediaProps {
  image?: string;
  alt: string;
  badge?: string;
  layout?: "horizontal" | "vertical";
  className?: string;
}

export function CardMedia({ image, alt, badge, layout = "horizontal", className }: CardMediaProps) {
  const isVertical = layout === "vertical";

  return (
    <div
      className={cn(
        "bg-muted overflow-hidden relative",
        isVertical ? "aspect-[16/10]" : "w-20 h-20 rounded-xl shrink-0",
        className,
      )}
    >
      {image ? (
        <img src={image} alt={alt} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className={cn("opacity-40", isVertical ? "text-3xl" : "text-2xl")}>🏷️</span>
        </div>
      )}
      {badge && (
        <span
          className={cn(
            "absolute text-2xs font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground shadow-sm",
            isVertical ? "top-2 left-2" : "bottom-1 left-1 text-[9px] px-1.5",
          )}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
