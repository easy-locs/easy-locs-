import { Heart } from "lucide-react";
import { memo } from "react";

interface Props {
  isSaved: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
}

const SaveButton = memo(function SaveButton({ isSaved, onToggle, size = "sm" }: Props) {
  const sz = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const iconSz = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(e);
      }}
      className={`${sz} rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
        isSaved
          ? "bg-destructive/90 text-white shadow-md"
          : "bg-background/70 text-foreground/70 hover:bg-background/90 hover:text-destructive"
      }`}
      aria-label={isSaved ? "Remove from saved" : "Save listing"}
    >
      <Heart className={`${iconSz} ${isSaved ? "fill-current" : ""}`} />
    </button>
  );
});

export default SaveButton;
