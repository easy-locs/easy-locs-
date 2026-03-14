/**
 * SwipeableThreadItem — WhatsApp-style swipe actions on conversation threads.
 * Left swipe reveals "More" + "Archive" buttons (like WhatsApp iOS).
 * Touch-optimized with conflict prevention for scroll, click, long-press, and multi-select.
 */
import { useState, useRef, useCallback, type ReactNode } from "react";
import { Archive, ArchiveRestore, MoreHorizontal } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Props {
  children: ReactNode;
  onDelete: () => void;
  onArchive: () => void;
  onMore?: () => void;
  isArchived?: boolean;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 60;
const BUTTON_WIDTH = 76; // Width of each action button
const TOTAL_REVEAL = BUTTON_WIDTH * 2; // Two buttons

export default function SwipeableThreadItem({
  children, onDelete, onArchive, onMore, isArchived = false, disabled = false,
}: Props) {
  const [offsetX, setOffsetX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const isTracking = useRef(false);
  const locked = useRef<"horizontal" | "vertical" | null>(null);
  const wasDragging = useRef(false);
  const currentOffset = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    startTime.current = Date.now();
    isTracking.current = true;
    locked.current = null;
    wasDragging.current = false;
    currentOffset.current = isOpen ? -TOTAL_REVEAL : 0;
  }, [disabled, isOpen]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTracking.current || disabled) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;

    if (!locked.current) {
      if (Math.abs(dy) > 8) { locked.current = "vertical"; return; }
      if (Math.abs(dx) > 8) locked.current = "horizontal";
      else return;
    }
    if (locked.current === "vertical") return;

    e.preventDefault();
    wasDragging.current = true;

    const raw = currentOffset.current + dx;
    // Only allow left swipe (negative), clamp
    const clamped = Math.max(-TOTAL_REVEAL - 20, Math.min(0, raw));
    // Apply dampening beyond total reveal
    const dampened = clamped < -TOTAL_REVEAL
      ? -TOTAL_REVEAL + (clamped + TOTAL_REVEAL) * 0.3
      : clamped;
    
    setOffsetX(dampened);
  }, [disabled]);

  const handleTouchEnd = useCallback(() => {
    if (!isTracking.current) return;
    isTracking.current = false;
    locked.current = null;

    // Snap logic: if past threshold, open; otherwise close
    if (Math.abs(offsetX) > SWIPE_THRESHOLD) {
      setOffsetX(-TOTAL_REVEAL);
      setIsOpen(true);
      haptic("light");
    } else {
      setOffsetX(0);
      setIsOpen(false);
    }
  }, [offsetX]);

  const close = useCallback(() => {
    setOffsetX(0);
    setIsOpen(false);
  }, []);

  const handleArchiveClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    haptic("medium");
    close();
    onArchive();
  }, [onArchive, close]);

  const handleMoreClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    haptic("light");
    close();
    onMore?.();
  }, [onMore, close]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    if (wasDragging.current) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (isOpen) {
      e.stopPropagation();
      e.preventDefault();
      close();
    }
  }, [isOpen, close]);

  const absOffset = Math.abs(offsetX);
  const moreWidth = Math.min(absOffset / 2, BUTTON_WIDTH);
  const archiveWidth = Math.min(absOffset / 2, BUTTON_WIDTH);

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons revealed behind content */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: `${absOffset}px` }}>
        {/* More button */}
        <button
          onClick={handleMoreClick}
          className="flex flex-col items-center justify-center gap-1 transition-colors active:opacity-80"
          style={{
            width: `${moreWidth}px`,
            background: "hsl(var(--muted-foreground) / 0.7)",
            color: "white",
          }}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>

        {/* Archive button */}
        <button
          onClick={handleArchiveClick}
          className="flex flex-col items-center justify-center gap-1 transition-colors active:opacity-80"
          style={{
            width: `${archiveWidth}px`,
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
          }}
        >
          {isArchived ? (
            <ArchiveRestore className="h-5 w-5" />
          ) : (
            <Archive className="h-5 w-5" />
          )}
          <span className="text-[10px] font-medium">
            {isArchived ? "Unarchive" : "Archive"}
          </span>
        </button>
      </div>

      {/* Swipeable content */}
      <div
        className="relative z-10"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isTracking.current ? "none" : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          willChange: "transform",
          background: "hsl(var(--background))",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClickCapture={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
}
