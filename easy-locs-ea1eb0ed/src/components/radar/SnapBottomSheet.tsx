import { useRef, useCallback, type ReactNode } from "react";
import { motion, type PanInfo } from "framer-motion";

export type SnapPoint = "peek" | "half" | "full";

const SNAP_HEIGHTS: Record<SnapPoint, string> = {
  peek: "72px",
  half: "50vh",
  full: "85vh",
};

interface Props {
  snap: SnapPoint;
  onSnapChange: (snap: SnapPoint) => void;
  peekContent?: ReactNode;
  children: ReactNode;
  resultCount?: number;
}

export default function SnapBottomSheet({ snap, onSnapChange, peekContent, children, resultCount }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

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
      className="absolute bottom-0 left-0 right-0 flex flex-col rounded-t-[24px] overflow-hidden"
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
          className="w-full flex flex-col items-center py-3 active:bg-muted/5 transition-colors"
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </button>
      </motion.div>

      {snap === "peek" && peekContent && (
        <div className="px-4 pb-2 shrink-0">
          {peekContent}
        </div>
      )}

      {snap === "peek" && !peekContent && resultCount != null && (
        <div className="px-4 pb-2 flex items-center justify-center shrink-0">
          <span className="text-[11px] font-semibold text-muted-foreground">
            {resultCount} places nearby
          </span>
        </div>
      )}

      {(snap === "half" || snap === "full") && (
        <div className="flex-1 overflow-y-auto px-4 pb-8 overscroll-contain">
          {children}
        </div>
      )}
    </motion.div>
  );
}
