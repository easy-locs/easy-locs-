/**
 * orbitGesturePolicy — Centralized gesture configuration.
 * Shared constants for consistent behavior across all message types.
 */

export const GESTURE_POLICY = {
  /** Minimum ms for long press activation */
  longPressMs: 400,
  /** Horizontal px threshold to register a swipe */
  swipeThresholdPx: 60,
  /** Max ms for a tap (vs long press) */
  tapMaxDurationMs: 250,
  /** Max px movement during press before cancellation */
  pressMoveTolerancePx: 10,
  /** Swipe reply: max distance in px */
  swipeReplyMaxPx: 120,
  /** Minimum haptic-eligible interactions */
  hapticEnabled: true,
} as const;

export type GestureType = "tap" | "longPress" | "swipeRight" | "swipeLeft" | "scroll";

/**
 * Resolve which gesture wins given pointer movement data.
 * Priority: scroll > swipe > longPress > tap
 */
export function resolveGesture(params: {
  deltaX: number;
  deltaY: number;
  durationMs: number;
}): GestureType {
  const { deltaX, deltaY, durationMs } = params;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  // Vertical movement dominates → scroll (cancel all)
  if (absY > GESTURE_POLICY.pressMoveTolerancePx && absY > absX) {
    return "scroll";
  }

  // Horizontal swipe
  if (absX > GESTURE_POLICY.swipeThresholdPx) {
    return deltaX > 0 ? "swipeRight" : "swipeLeft";
  }

  // Long press
  if (durationMs >= GESTURE_POLICY.longPressMs && absX < GESTURE_POLICY.pressMoveTolerancePx && absY < GESTURE_POLICY.pressMoveTolerancePx) {
    return "longPress";
  }

  // Tap
  return "tap";
}
