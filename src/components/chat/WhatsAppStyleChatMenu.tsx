import { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";

const MENU_ITEMS = [
  { label: "View contact", key: "contact" },
  { label: "Media, links & docs", key: "media" },
  { label: "Search", key: "search" },
  { label: "Mute notifications", key: "mute" },
  { label: "Wallpaper", key: "wallpaper" },
  { label: "Clear chat", key: "clear", danger: true },
] as const;

export function WhatsAppStyleChatMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-accent/10 active:scale-[0.95]"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
      >
        <MoreVertical className="h-5 w-5 text-foreground/70" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-52 rounded-2xl border border-border/40 bg-card py-1.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setOpen(false)}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent/8 active:scale-[0.98] ${
                item.danger ? "text-destructive" : "text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
