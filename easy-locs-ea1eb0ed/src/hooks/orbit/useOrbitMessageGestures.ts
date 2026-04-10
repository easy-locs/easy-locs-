/**
 * useOrbitMessageGestures — Per-message gesture handling hook.
 * Encapsulates tap, long press, swipe-reply logic with strict priority.
 */
import { useCallback, useRef, useState } from "react";
import { GESTURE_POLICY, resolveGesture } from "@/stores/orbit/gesture.policy";

interface GestureCallbacks {
  onTap?: () => void;
  onLongPress?: () => void;
  onSwipeReply?: () => void;
}

interface GestureConfig {
  disabled?: boolean;
  /** Whether swipe-reply is allowed (e.g. false for own messages) */
  swipeReplyEnabled?: boolean;
}

export function useOrbitMessageGestures(
  callbacks: GestureCallbacks,
  config: GestureConfig = {},
) {
  const { disabled = false, swipeReplyEnabled = true } = config;

  const [pressed, setPressed] = useState(false);
  const [dragX, setDragX] = useState(0);

  const pointerStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureResolved = useRef(false);

  const clearTimers = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      pointerStart.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      gestureResolved.current = false;
      setPressed(true);

      longPressTimer.current = setTimeout(() => {
        if (!gestureResolved.current && pointerStart.current) {
          gestureResolved.current = true;
          setPressed(false);
          if (GESTURE_POLICY.hapticEnabled && navigator.vibrate) {
            navigator.vibrate(15);
          }
          callbacks.onLongPress?.();
        }
      }, GESTURE_POLICY.longPressMs);
    },
    [disabled, callbacks, clearTimers],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerStart.current || gestureResolved.current) return;

      const deltaX = e.clientX - pointerStart.current.x;
      const deltaY = e.clientY - pointerStart.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > GESTURE_POLICY.pressMoveTolerancePx || absY > GESTURE_POLICY.pressMoveTolerancePx) {
        clearTimers();
        setPressed(false);
      }

      // Vertical scroll — cancel all
      if (absY > GESTURE_POLICY.pressMoveTolerancePx && absY > absX) {
        gestureResolved.current = true;
        setDragX(0);
        return;
      }

      // Horizontal swipe tracking
      if (deltaX > 0 && swipeReplyEnabled && callbacks.onSwipeReply) {
        setDragX(Math.min(deltaX, GESTURE_POLICY.swipeReplyMaxPx));
      }
    },
    [clearTimers, swipeReplyEnabled, callbacks],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      clearTimers();
      setPressed(false);

      if (!pointerStart.current || gestureResolved.current) {
        setDragX(0);
        pointerStart.current = null;
        return;
      }

      const deltaX = e.clientX - pointerStart.current.x;
      const deltaY = e.clientY - pointerStart.current.y;
      const duration = Date.now() - pointerStart.current.time;
      const gesture = resolveGesture({ deltaX, deltaY, durationMs: duration });

      pointerStart.current = null;
      setDragX(0);

      if (gesture === "swipeRight" && swipeReplyEnabled && callbacks.onSwipeReply) {
        callbacks.onSwipeReply();
        return;
      }

      if (gesture === "tap") {
        callbacks.onTap?.();
      }
    },
    [clearTimers, swipeReplyEnabled, callbacks],
  );

  const onPointerCancel = useCallback(() => {
    clearTimers();
    setPressed(false);
    setDragX(0);
    pointerStart.current = null;
  }, [clearTimers]);

  return {
    pressed,
    dragX,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}
