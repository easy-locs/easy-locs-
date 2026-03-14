/**
 * SwipeableThreadItem — Swipe-to-delete/archive on conversation threads.
 * Left swipe → Delete (red), Right swipe → Archive (teal).
 * Touch-optimized with conflict prevention for scroll, click, long-press, and multi-select.
 */
import { useState, useRef, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, type PanInfo, AnimatePresence } from "framer-motion";
import { Trash2, Archive, ArchiveRestore } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Props {
  children: ReactNode;
  onDelete: () => void;
  onArchive: () => void;
  isArchived?: boolean;
  disabled?: boolean;
}

const THRESHOLD = 72;
const VELOCITY_THRESHOLD = 300;

export default function SwipeableThreadItem({
  children, onDelete, onArchive, isArchived = false, disabled = false,
}: Props) {
  const x = useMotionValue(0);
  const [dismissed, setDismissed] = useState(false);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const isHorizontalDrag = useRef<boolean | null>(null);

  // Opacity transforms for background reveals
  const deleteOpacity = useTransform(x, [-160, -THRESHOLD, -20, 0], [1, 0.9, 0, 0]);
  const archiveOpacity = useTransform(x, [0, 20, THRESHOLD, 160], [0, 0, 0.9, 1]);

  // Scale transforms for icons
  const deleteScale = useTransform(x, [-160, -THRESHOLD, 0], [1.2, 1, 0.5]);
  const archiveScale = useTransform(x, [0, THRESHOLD, 160], [0.5, 1, 1.2]);

  const handleDragStart = () => {
    isDragging.current = false;
    isHorizontalDrag.current = null;
  };

  const handleDrag = (_: any, info: PanInfo) => {
    // Determine drag direction on first significant movement
    if (isHorizontalDrag.current === null) {
      const absX = Math.abs(info.offset.x);
      const absY = Math.abs(info.offset.y);
      if (absX > 8 || absY > 8) {
        isHorizontalDrag.current = absX > absY * 1.5;
      }
    }

    // If vertical scroll detected, kill horizontal drag
    if (isHorizontalDrag.current === false) {
      x.set(0);
      return;
    }

    if (Math.abs(info.offset.x) > 10) {
      isDragging.current = true;
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    isHorizontalDrag.current = null;

    if (disabled) {
      x.set(0);
      return;
    }

    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Left swipe = Delete
    if (offset < -THRESHOLD || (offset < -30 && velocity < -VELOCITY_THRESHOLD)) {
      haptic("medium");
      setDismissed(true);
      setTimeout(onDelete, 200);
      return;
    }

    // Right swipe = Archive/Unarchive
    if (offset > THRESHOLD || (offset > 30 && velocity > VELOCITY_THRESHOLD)) {
      haptic("medium");
      setDismissed(true);
      setTimeout(onArchive, 200);
      return;
    }

    // Reset below threshold
    isDragging.current = false;
  };

  // Prevent click from firing after swipe
  const handleClick = (e: React.MouseEvent) => {
    if (isDragging.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          className="relative overflow-hidden"
          initial={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Delete background (left swipe) */}
          <motion.div
            className="absolute inset-0 flex items-center justify-end px-6"
            style={{
              background: "hsl(var(--destructive))",
              opacity: deleteOpacity,
            }}
          >
            <motion.div style={{ scale: deleteScale }} className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive-foreground" />
              <span className="text-xs font-semibold text-destructive-foreground">Delete</span>
            </motion.div>
          </motion.div>

          {/* Archive background (right swipe) */}
          <motion.div
            className="absolute inset-0 flex items-center justify-start px-6"
            style={{
              background: "hsl(var(--primary))",
              opacity: archiveOpacity,
            }}
          >
            <motion.div style={{ scale: archiveScale }} className="flex items-center gap-2">
              {isArchived ? (
                <ArchiveRestore className="h-5 w-5 text-primary-foreground" />
              ) : (
                <Archive className="h-5 w-5 text-primary-foreground" />
              )}
              <span className="text-xs font-semibold text-primary-foreground">
                {isArchived ? "Unarchive" : "Archive"}
              </span>
            </motion.div>
          </motion.div>

          {/* Swipeable content */}
          <motion.div
            drag={disabled ? false : "x"}
            dragConstraints={{ left: -160, right: 160 }}
            dragElastic={0.15}
            dragDirectionLock
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            onClickCapture={handleClick}
            style={{ x }}
            className="relative z-10 bg-background"
            whileTap={{ cursor: "grabbing" }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
