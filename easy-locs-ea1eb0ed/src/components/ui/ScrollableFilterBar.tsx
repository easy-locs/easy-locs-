/**
 * ScrollableFilterBar — Smart horizontal filter pills with:
 * - Smooth snap scrolling
 * - Auto-centering on selection
 * - Edge fade indicators
 * - Native-feeling mobile UX
 */
import { useRef, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

export interface FilterOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface Props<T extends string = string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Show count badge next to label (only if count > 0 and not "all") */
  showCounts?: boolean;
  className?: string;
}

export default function ScrollableFilterBar<T extends string = string>({
  options, value, onChange, showCounts, className,
}: Props<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll state
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateScrollState); ro.disconnect(); };
  }, [updateScrollState, options.length]);

  // Auto-center selected item
  const scrollToItem = useCallback((id: string) => {
    const el = scrollRef.current;
    const btn = itemRefs.current.get(id);
    if (!el || !btn) return;
    const elRect = el.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const target = btn.offsetLeft - (elRect.width / 2) + (btnRect.width / 2);
    el.scrollTo({ left: target, behavior: "smooth" });
  }, []);

  // Scroll to active on mount / change
  useEffect(() => {
    requestAnimationFrame(() => scrollToItem(value));
  }, [value, scrollToItem]);

  const handleSelect = useCallback((id: T) => {
    haptic("selection");
    onChange(id);
    // scrollToItem will fire via useEffect on value change
  }, [onChange]);

  return (
    <div className={cn("relative", className)}>
      {/* Left fade */}
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 transition-opacity duration-200"
        style={{
          background: "linear-gradient(to right, hsl(var(--hud-bg)), transparent)",
          opacity: canScrollLeft ? 1 : 0,
        }}
      />
      {/* Right fade */}
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 transition-opacity duration-200"
        style={{
          background: "linear-gradient(to left, hsl(var(--hud-bg)), transparent)",
          opacity: canScrollRight ? 1 : 0,
        }}
      />

      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto pb-1 scroll-smooth"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {options.map(opt => {
          const isActive = value === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              ref={el => { if (el) itemRefs.current.set(opt.id, el); }}
              onClick={() => handleSelect(opt.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.6875rem] font-medium whitespace-nowrap transition-all shrink-0"
              style={{
                scrollSnapAlign: "center",
                background: isActive ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-surface) / 0.5)",
                color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.6)",
                border: `1px solid ${isActive ? "hsl(var(--hud-cyan) / 0.2)" : "transparent"}`,
                transform: isActive ? "scale(1.04)" : "scale(1)",
              }}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {opt.label}
              {showCounts && opt.count != null && opt.count > 0 && opt.id !== "all" && (
                <span className="opacity-50 ml-0.5">{opt.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Hide scrollbar via inline style */}
      <style>{`
        div[style*="scroll-snap-type"]::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
