/**
 * YouSmartSettingCard — Premium settings row for the You cockpit.
 * Large tap targets, clean hierarchy, consistent icon sizing.
 */
import { ChevronRight, type LucideIcon } from "lucide-react";

interface YouSmartSettingCardProps {
  icon: LucideIcon;
  label: string;
  summary: string;
  onClick: () => void;
  accentColor?: string;
}

export default function YouSmartSettingCard({
  icon: Icon, label, summary, onClick, accentColor,
}: YouSmartSettingCardProps) {
  const color = accentColor || "hsl(var(--primary))";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-colors text-left group hover:bg-muted/40 active:scale-[0.99]"
      style={{ minHeight: 56 }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}12` }}
      >
        <Icon className="h-[18px] w-[18px]" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium" style={{ color: "hsl(var(--foreground))" }}>{label}</p>
        <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "hsl(var(--muted-foreground))" }}>
          {summary}
        </p>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 transition-colors"
        style={{ color: "hsl(var(--muted-foreground) / 0.3)" }}
      />
    </button>
  );
}
