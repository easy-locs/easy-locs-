/**
 * OrbitMessageInteractiveWrapper — Universal gesture + selection layer for every message.
 * Handles: tap, long press, swipe-to-reply, pressed state, selection overlay.
 * Zero business logic — purely interaction routing.
 */
import { memo, useCallback, useRef, useState, type ReactNode } from "react";
import { Reply } from "lucide-react";
import { GESTURE_POLICY, resolveGesture } from "@/stores/orbit/gesture.policy";
import { useOrbitSelectionStore } from "@/stores/orbit/selection.store";
import { cn } from "@/lib/utils";

interface Props {
  messageId: string;
  conversationId: string;
  isMe: boolean;
  children: ReactNode;
  onTap?: () => void;
  onLongPress?: () => void;
  onSwipeReply?: () => void;
  /** Disable interactions (e.g. system messages) */
  disabled?: boolean;
}

function OrbitMessageInteractiveWrapper({
  messageId,
  conversationId,
  isMe,
  children,
  onTap,
  onLongPress,
  onSwipeReply,
  disabled = false,
}: Props) {
  const selectionMode = useOrbitSelectionStore((s) => s.mode);
  const isSelected = useOrbitSelectionStore((s) => s.selectedIds.has(messageId));
  const enterSelectionMode = useOrbitSelectionStore((s) => s.enterSelectionMode);
  const toggleSelection = useOrbitSelectionStore((s) => s.toggleSelection);

  const [pressed, setPressed] = useState(false);
  const [swipeX, setSwipeX] = useState(0);

  const pointerStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureResolved = useRef(false);

  const clearTimers = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      pointerStart.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      gestureResolved.current = false;
      setPressed(true);

      // Start long press timer
      longPressTimer.current = setTimeout(() => {
        if (!gestureResolved.current && pointerStart.current) {
          gestureResolved.current = true;
          setPressed(false);

          if (selectionMode === "selecting") {
            toggleSelection(messageId);
          } else {
            // Haptic feedback
            if (GESTURE_POLICY.hapticEnabled && navigator.vibrate) {
              navigator.vibrate(15);
            }
            if (onLongPress) {
              onLongPress();
            } else {
              enterSelectionMode(conversationId, messageId);
            }
          }
        }
      }, GESTURE_POLICY.longPressMs);
    },
    [disabled, selectionMode, messageId, conversationId, onLongPress, toggleSelection, enterSelectionMode],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerStart.current || gestureResolved.current) return;

      const deltaX = e.clientX - pointerStart.current.x;
      const deltaY = e.clientY - pointerStart.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Cancel long press if finger moves too much
      if (absX > GESTURE_POLICY.pressMoveTolerancePx || absY > GESTURE_POLICY.pressMoveTolerancePx) {
        clearTimers();
        setPressed(false);
      }

      // Vertical scroll — cancel all
      if (absY > GESTURE_POLICY.pressMoveTolerancePx && absY > absX) {
        gestureResolved.current = true;
        setSwipeX(0);
        return;
      }

      if (deltaX > 0 && onSwipeReply) {
        setSwipeX(Math.min(deltaX, GESTURE_POLICY.swipeReplyMaxPx));
      }
    },
    [clearTimers, isMe, onSwipeReply],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      clearTimers();
      setPressed(false);

      if (!pointerStart.current || gestureResolved.current) {
        setSwipeX(0);
        pointerStart.current = null;
        return;
      }

      const deltaX = e.clientX - pointerStart.current.x;
      const deltaY = e.clientY - pointerStart.current.y;
      const duration = Date.now() - pointerStart.current.time;
      const gesture = resolveGesture({ deltaX, deltaY, durationMs: duration });

      pointerStart.current = null;
      setSwipeX(0);

      if (gesture === "swipeRight" && onSwipeReply) {
        if (GESTURE_POLICY.hapticEnabled && navigator.vibrate) {
          navigator.vibrate(10);
        }
        onSwipeReply();
        return;
      }

      if (gesture === "tap") {
        if (selectionMode === "selecting") {
          toggleSelection(messageId);
        } else if (onTap) {
          onTap();
        }
      }
    },
    [clearTimers, selectionMode, messageId, isMe, onTap, onSwipeReply, toggleSelection],
  );

  const handlePointerCancel = useCallback(() => {
    clearTimers();
    setPressed(false);
    setSwipeX(0);
    pointerStart.current = null;
  }, [clearTimers]);

  return (
    <div
      className={cn(
        "relative transition-colors duration-100 select-none",
        pressed && "bg-accent/10",
        isSelected && "bg-primary/10",
        selectionMode === "selecting" && "cursor-pointer",
      )}
      style={{
        transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined,
        transition: swipeX > 0 ? "none" : "transform 200ms ease-out",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {swipeX > 20 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity"
          style={{
            left: 4,
            opacity: Math.min(swipeX / 50, 1),
            transform: `translateY(-50%) scale(${Math.min(swipeX / 50, 1)})`,
          }}
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
            <Reply className="h-3.5 w-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
          </div>
        </div>
      )}
      {selectionMode === "selecting" && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 z-10">
          <div
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150",
              isSelected
                ? "bg-primary border-primary text-primary-foreground"
                : "border-muted-foreground/40 bg-background",
            )}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Message content with selection padding */}
      <div className={cn(selectionMode === "selecting" && "pl-8 transition-all duration-150")}>
        {children}
      </div>
    </div>
  );
}

export default memo(OrbitMessageInteractiveWrapper);
