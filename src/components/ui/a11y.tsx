/**
 * Accessibility Utilities
 * Reusable a11y primitives for WCAG 2.1 AA compliance.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

/* ─── VisuallyHidden ─── */
/**
 * Renders content visible only to screen readers.
 * Prefer this over sr-only class for dynamic content.
 */
export function VisuallyHidden({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cn("sr-only", props.className)}
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        borderWidth: 0,
        ...props.style,
      }}
    >
      {children}
    </span>
  );
}

/* ─── SkipLink ─── */
/**
 * Skip-to-content link for keyboard users.
 * Place at the very top of the page layout.
 */
export function SkipLink({
  targetId = "main-content",
  label = "Aller au contenu principal",
}: {
  targetId?: string;
  label?: string;
}) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {label}
    </a>
  );
}

/* ─── LiveRegion ─── */
/**
 * ARIA live region for dynamic announcements to screen readers.
 * Updates to `message` are announced automatically.
 */
export function LiveRegion({
  message,
  politeness = "polite",
  className,
}: {
  message: string;
  politeness?: "polite" | "assertive";
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={cn("sr-only", className)}
    >
      {message}
    </div>
  );
}

/* ─── FocusTrap ─── */
/**
 * Traps keyboard focus within a container.
 * Useful for modals and overlays not using Radix Dialog.
 */
export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active = true) {
  React.useEffect(() => {
    if (!active || !ref.current) return;

    const container = ref.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    // Focus first element on mount
    const firstFocusable = container.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [ref, active]);
}

/* ─── useReducedMotion ─── */
/**
 * Returns true if the user prefers reduced motion.
 * Use to disable animations for accessibility.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

/* ─── useAnnounce ─── */
/**
 * Programmatically announce messages to screen readers.
 * Returns a function you can call with a message string.
 */
export function useAnnounce(politeness: "polite" | "assertive" = "polite") {
  const [message, setMessage] = React.useState("");

  const announce = React.useCallback((text: string) => {
    // Clear then set to ensure re-announcement of same message
    setMessage("");
    requestAnimationFrame(() => setMessage(text));
  }, []);

  const region = React.useMemo(
    () => <LiveRegion message={message} politeness={politeness} />,
    [message, politeness]
  );

  return { announce, region };
}
