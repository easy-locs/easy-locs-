/**
 * SwipeableCallItem — Swipe-to-delete/archive on call entries.
 * Left swipe reveals delete, right swipe reveals archive.
 */
import { useState, useRef, type ReactNode } from "react";
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

  if (swiped) return null;

  return (
    <div className="relative overflow-hidden">
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
