import { useRef, useCallback, useEffect, type ReactNode } from "react";
import { motion, type PanInfo } from "framer-motion";

export type TaxiSnapPoint = "peek" | "half" | "full";

const SNAP_HEIGHTS: Record<TaxiSnapPoint, string> = {
  peek: "220px",
  half: "55vh",
  full: "85vh",
};

interface Props {
  snap: TaxiSnapPoint;
  onSnapChange: (snap: TaxiSnapPoint) => void;
  children: ReactNode;
  className?: string;
}

export default function TaxiBottomSheet({ snap, onSnapChange, children, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (snap === "full") {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onSnapChange("half");
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [snap, onSnapChange]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 300 || offset > 80) {
      if (snap === "full") onSnapChange("half");
      else if (snap === "half") onSnapChange("peek");
      else onSnapChange("peek");
    } else if (velocity < -300 || offset < -80) {
      if (snap === "peek") onSnapChange("half");
      else if (snap === "half") onSnapChange("full");
      else onSnapChange("full");
    }
  }, [snap, onSnapChange]);

  const handleGripTap = useCallback(() => {
    if (snap === "peek") onSnapChange("half");
    else if (snap === "half") onSnapChange("full");
    else onSnapChange("peek");
  }, [snap, onSnapChange]);

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-label="Taxi booking"
      className={`absolute bottom-0 left-0 right-0 flex flex-col rounded-t-[24px] overflow-hidden ${className ?? ""}`}
      style={{
        zIndex: 50,
        background: "hsl(var(--card) / 0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid hsl(var(--border) / 0.12)",
        boxShadow: "0 -8px 40px hsl(var(--background) / 0.4)",
      }}
      animate={{
        height: SNAP_HEIGHTS[snap],
      }}
      transition={{ type: "spring", damping: 32, stiffness: 320 }}
    >
      <motion.div
        className="shrink-0 cursor-grab active:cursor-grabbing"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        <button
          onClick={handleGripTap}
          aria-label={`${snap === "peek" ? "Expand" : snap === "half" ? "Expand fully" : "Collapse"} booking panel`}
          className="w-full flex flex-col items-center py-3 active:bg-muted/5 transition-colors"
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </button>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 overscroll-contain">
        {children}
      </div>
    </motion.div>
  );
}
