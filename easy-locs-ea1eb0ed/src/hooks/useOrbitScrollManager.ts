import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

export function useOrbitScrollManager(
  containerRef: RefObject<HTMLElement | null>,
  messageCount: number,
  typingIndicator: boolean,
  conversationId?: string
) {
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const wasNearBottomRef = useRef(true);
  const lastKnownScrollHeightRef = useRef(0);
  const isFirstRenderRef = useRef(true);
  const lastMessageCountRef = useRef(0);
  const prevConversationIdRef = useRef(conversationId);

  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      prevConversationIdRef.current = conversationId;
      wasNearBottomRef.current = true;
      isFirstRenderRef.current = true;
      lastMessageCountRef.current = 0;
      lastKnownScrollHeightRef.current = 0;
      setShowJumpToBottom(false);
    }
  }, [conversationId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      const nearBottom = distanceFromBottom < 150;
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

    const prevCount = lastMessageCountRef.current;
    lastMessageCountRef.current = messageCount;

    const isNewMessage = messageCount > prevCount;

    if (isFirstRenderRef.current && messageCount > 0) {
      isFirstRenderRef.current = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
          wasNearBottomRef.current = true;
          setShowJumpToBottom(false);
        });
      });
      return;
    }

    if (wasNearBottomRef.current && (isNewMessage || nextHeight > prevHeight)) {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: isNewMessage ? "smooth" : "auto" });
        setShowJumpToBottom(false);
      });
    }
  }, [messageCount, typingIndicator]);

  const jumpToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    wasNearBottomRef.current = true;
    setShowJumpToBottom(false);
  }, [containerRef]);

  const scrollToBottomInstant = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      wasNearBottomRef.current = true;
      setShowJumpToBottom(false);
    });
  }, [containerRef]);

  return {
    showJumpToBottom,
    jumpToBottom,
    scrollToBottomInstant,
  };
}
