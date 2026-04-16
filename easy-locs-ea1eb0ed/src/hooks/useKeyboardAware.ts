import { useEffect, useRef, type RefObject } from "react";
import { keyboardManager } from "@/lib/platform/keyboard-manager";

export function useKeyboardAware(containerRef?: RefObject<HTMLElement | null>) {
  const scrollRef = useRef<HTMLElement | null>(null);
  const ref = containerRef ?? scrollRef;

  useEffect(() => {
    const unsubShow = keyboardManager.onShow((info) => {
      const el = ref.current;
      if (!el) return;

      el.style.transition = "padding-bottom 0.2s ease";
      el.style.paddingBottom = `${info.keyboardHeight}px`;

      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement) {
          active.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      });
    });

    const unsubHide = keyboardManager.onHide(() => {
      const el = ref.current;
      if (!el) return;

      el.style.transition = "padding-bottom 0.2s ease";
      el.style.paddingBottom = "";
    });

    return () => {
      unsubShow();
      unsubHide();
    };
  }, []);

  return ref;
}
