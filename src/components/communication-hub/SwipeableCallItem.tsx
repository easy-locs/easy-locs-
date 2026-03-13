/**
 * SwipeableCallItem — Swipe-to-delete/archive on call entries.
 * Left swipe reveals delete, right swipe reveals archive.
 * Also supports keyboard Delete key.
 */
import { useState, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Trash2, Archive } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Props {
  children: ReactNode;
  onDelete: () => void;
  onArchive?: () => void;
}

const THRESHOLD = 80;

export default function SwipeableCallItem({ children, onDelete, onArchive }: Props) {
  const x = useMotionValue(0);
  const [swiped, setSwiped] = useState<"left" | "right" | null>(null);
  const [focused, setFocused] = useState(false);

  // Left swipe background (delete)
  const deleteBg = useTransform(x, [-200, -THRESHOLD, 0], [1, 0.8, 0]);
  // Right swipe background (archive) 
  const archiveBg = useTransform(x, [0, THRESHOLD, 200], [0, 0.8, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    if (offset < -THRESHOLD) {
      haptic("medium");
      setSwiped("left");
      onDelete();
    } else if (offset > THRESHOLD && onArchive) {
      haptic("medium");
      setSwiped("right");
      onArchive();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      haptic("medium");
      setSwiped("left");
      onDelete();
    }
  };

  if (swiped) return null;

  return (
    <div
      className="relative overflow-hidden"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        outline: focused ? "2px solid hsl(var(--hud-cyan) / 0.3)" : "none",
        outlineOffset: -2,
        borderRadius: 4,
      }}
    >
      {/* Delete background (left swipe) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end px-6"
        style={{ background: "hsl(var(--hud-danger))", opacity: deleteBg }}
      >
        <Trash2 className="h-5 w-5 text-white" />
      </motion.div>

      {/* Archive background (right swipe) */}
      {onArchive && (
        <motion.div
          className="absolute inset-0 flex items-center justify-start px-6"
          style={{ background: "hsl(var(--hud-cyan))", opacity: archiveBg }}
        >
          <Archive className="h-5 w-5 text-white" />
        </motion.div>
      )}

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -160, right: onArchive ? 160 : 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}
