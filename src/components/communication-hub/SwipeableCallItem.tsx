/**
 * SwipeableCallItem — Swipe-to-delete on call entries.
 * Left swipe reveals Delete button (like WhatsApp calls).
 * Native touch implementation for reliable iOS behavior.
 */
import { useState, useRef, useCallback, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Props {
  children: ReactNode;
  onDelete: () => void;
  onArchive?: () => void;
}

const BUTTON_WIDTH = 76;

export default function SwipeableCallItem({ children, onDelete }: Props) {
  const [offsetX, setOffsetX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const startX = useRef(0);
  const isTracking = useRef(false);
  const locked = useRef<"h" | "v" | null>(null);
  const wasDragging = useRef(false);
  const baseOffset = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    isTracking.current = true;
    locked.current = null;
    wasDragging.current = false;
    baseOffset.current = isOpen ? -BUTTON_WIDTH : 0;
  }, [isOpen]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTracking.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = e.touches[0].clientY - (e as any)._startY || 0;

    if (!locked.current) {
      if (Math.abs(dx) > 8) locked.current = "h";
      else return;
    }
    if (locked.current !== "h") return;

    e.preventDefault();
    wasDragging.current = true;

    const raw = baseOffset.current + dx;
    const clamped = Math.max(-BUTTON_WIDTH - 15, Math.min(0, raw));
    setOffsetX(clamped);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isTracking.current) return;
    isTracking.current = false;
    locked.current = null;

    if (Math.abs(offsetX) > BUTTON_WIDTH * 0.5) {
      setOffsetX(-BUTTON_WIDTH);
      setIsOpen(true);
      haptic("light");
    } else {
      setOffsetX(0);
      setIsOpen(false);
    }
  }, [offsetX]);

  const close = useCallback(() => {
    setOffsetX(0);
    setIsOpen(false);
  }, []);

  const handleDeleteClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    haptic("medium");
    close();
    onDelete();
  }, [onDelete, close]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    if (wasDragging.current) { e.stopPropagation(); e.preventDefault(); return; }
    if (isOpen) { e.stopPropagation(); e.preventDefault(); close(); }
  }, [isOpen, close]);

  return (
    <div className="relative overflow-hidden">
      {/* Delete button revealed */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: `${Math.abs(offsetX)}px` }}>
        <button
          onClick={handleDeleteClick}
          className="flex flex-col items-center justify-center gap-1 w-full active:opacity-80"
          style={{
            background: "hsl(var(--destructive))",
            color: "hsl(var(--destructive-foreground))",
          }}
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-[10px] font-medium">Delete</span>
        </button>
      </div>

      {/* Content */}
      <div
        className="relative z-10"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isTracking.current ? "none" : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          willChange: "transform",
          background: "hsl(var(--background))",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClickCapture={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
}
