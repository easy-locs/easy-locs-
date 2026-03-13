import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Palette, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type AccentTone = "gold" | "blue";

const ORBIT_ACCENT_STORAGE_KEY = "easylocs-orbit-accent";

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [accentTone, setAccentTone] = useState<AccentTone>("gold");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const saved = (localStorage.getItem(ORBIT_ACCENT_STORAGE_KEY) as AccentTone | null) || "gold";
    const tone = saved === "blue" ? "blue" : "gold";
    setAccentTone(tone);
    document.documentElement.setAttribute("data-orbit-accent", tone);
  }, [mounted]);

  const setOrbitAccent = (tone: AccentTone) => {
    setAccentTone(tone);
    localStorage.setItem(ORBIT_ACCENT_STORAGE_KEY, tone);
    document.documentElement.setAttribute("data-orbit-accent", tone);
  };

  if (!mounted) return null;

  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  const accentOptions: { value: AccentTone; label: string }[] = [
    { value: "gold", label: "Orbit Gold" },
    { value: "blue", label: "Orbit Blue" },
  ];

  const current = options.find((o) => o.value === theme) || options[2];
  const CurrentIcon = current.icon;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Toggle theme"
      >
        <CurrentIcon className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg py-1.5 z-50 min-w-[170px]">
          {options.map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setTheme(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  active ? "text-accent font-medium bg-accent/5" : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {opt.label}
              </button>
            );
          })}

          <div className="my-1 mx-2 border-t border-border/60" />

          <div className="px-3 py-1.5 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            <Palette className="h-3.5 w-3.5" />
            Orbit Accent
          </div>

          {accentOptions.map((opt) => {
            const active = accentTone === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setOrbitAccent(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                  active ? "text-primary font-medium bg-primary/5" : "text-foreground hover:bg-muted"
                }`}
              >
                <span>{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
