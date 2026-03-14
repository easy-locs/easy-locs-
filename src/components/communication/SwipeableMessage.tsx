/**
 * SwipeableMessage — Touch swipe on message bubbles.
 * Swipe left = Delete (for me). Swipe right = Reply.
 * Elastic spring-back, conflict-free with scroll/long-press.
 */
import { useRef, useState, useCallback, type ReactNode } from "react";
import { Trash2, Reply } from "lucide-react";

interface Props {
  children: ReactNode;
  onSwipeLeft?: () => void;   // Delete
  onSwipeRight?: () => void;  // Reply
  disabled?: boolean;
}

const THRESHOLD = 72;       // px to trigger
const MAX_OFFSET = 100;
const VELOCITY_MIN = 0.3;   // px/ms

export default function SwipeableMessage({ children, onSwipeLeft, onSwipeRight, disabled }: Props) {
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const [offset, setOffset] = useState(0);
  const isTracking = useRef(false);
  const locked = useRef<"horizontal" | "vertical" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    startTime.current = Date.now();
    isTracking.current = true;
    locked.current = null;
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTracking.current || disabled) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;

    // Lock direction after 8px movement
    if (!locked.current) {
      if (Math.abs(dy) > 8) { locked.current = "vertical"; return; }
      if (Math.abs(dx) > 8) locked.current = "horizontal";
      else return;
    }
    if (locked.current === "vertical") return;

    // Prevent vertical scroll during horizontal swipe
    e.preventDefault();

    // Apply dampening beyond threshold
    const sign = dx > 0 ? 1 : -1;
    const abs = Math.abs(dx);
    const dampened = abs > THRESHOLD
      ? THRESHOLD + (abs - THRESHOLD) * 0.3
      : abs;
    const clamped = Math.min(dampened, MAX_OFFSET) * sign;

    // Only allow configured directions
    if (clamped < 0 && !onSwipeLeft) return;
    if (clamped > 0 && !onSwipeRight) return;

    setOffset(clamped);
  }, [disabled, onSwipeLeft, onSwipeRight]);

  const handleTouchEnd = useCallback(() => {
    if (!isTracking.current) return;
    isTracking.current = false;

    const elapsed = Date.now() - startTime.current;
    const velocity = Math.abs(offset) / Math.max(elapsed, 1);
    const triggered = Math.abs(offset) >= THRESHOLD || (Math.abs(offset) > 30 && velocity >= VELOCITY_MIN);

    if (triggered) {
      if (offset < 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (offset > 0 && onSwipeRight) {
        onSwipeRight();
      }
    }

    setOffset(0);
    locked.current = null;
  }, [offset, onSwipeLeft, onSwipeRight]);

  const absOffset = Math.abs(offset);
  const isLeft = offset < 0;
  const iconOpacity = Math.min(absOffset / THRESHOLD, 1);
  const iconScale = 0.6 + iconOpacity * 0.4;
  const triggered = absOffset >= THRESHOLD;

  return (
    <div className="relative overflow-hidden" ref={containerRef}>
      {/* Left action indicator (delete) */}
      {isLeft && absOffset > 4 && (
        <div
          className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none"
          style={{ opacity: iconOpacity }}
        >
          <div
            className={`rounded-full p-2 transition-colors ${triggered ? "bg-destructive" : "bg-destructive/50"}`}
            style={{ transform: `scale(${iconScale})` }}
          >
            <Trash2 className="h-4 w-4 text-destructive-foreground" />
          </div>
        </div>
      )}

      {/* Right action indicator (reply) */}
      {!isLeft && absOffset > 4 && (
        <div
          className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none"
          style={{ opacity: iconOpacity }}
        >
          <div
            className={`rounded-full p-2 transition-colors ${triggered ? "bg-primary" : "bg-primary/50"}`}
            style={{ transform: `scale(${iconScale})` }}
          >
            <Reply className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      )}

      {/* Message content */}
      <div
        className="relative"
        style={{
          transform: `translateX(${offset}px)`,
          transition: isTracking.current ? "none" : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          willChange: "transform",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
