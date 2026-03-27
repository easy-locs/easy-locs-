import { type RefObject, useEffect, useRef, useState } from "react";

export function useOrbitScrollManager(
  containerRef: RefObject<HTMLElement | null>,
  deps: unknown[]
) {
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const wasNearBottomRef = useRef(true);
  const lastKnownScrollHeightRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      const nearBottom = distanceFromBottom < 120;
      wasNearBottomRef.current = nearBottom;
      setShowJumpToBottom(!nearBottom);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => el.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prevHeight = lastKnownScrollHeightRef.current;
    const nextHeight = el.scrollHeight;
    lastKnownScrollHeightRef.current = nextHeight;

    if (wasNearBottomRef.current || nextHeight <= prevHeight) {
      requestAnimationFrame(() => {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: "smooth",
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const jumpToBottom = () => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    wasNearBottomRef.current = true;
    setShowJumpToBottom(false);
  };

  return {
    showJumpToBottom,
    jumpToBottom,
  };
}
