import { useRef, useCallback } from "react";

export function useLongPress(
  onLongPress: () => void,
  onClick?: () => void,
  delay = 500
) {
  const timerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);

  const start = useCallback(() => {
    longPressedRef.current = false;
    timerRef.current = window.setTimeout(() => {
      longPressedRef.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const end = useCallback(() => {
    clear();
    if (!longPressedRef.current) onClick?.();
  }, [clear, onClick]);

  return {
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: end,
  };
}
