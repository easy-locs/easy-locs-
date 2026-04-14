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
  const iconColor = accentColor || "hsl(var(--accent))";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3 transition-colors text-left active:scale-[0.99] active:bg-muted/30"
      style={{ minHeight: 52 }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${iconColor.replace(")", " / 0.08)")}` }}
      >
        <Icon className="h-[17px] w-[17px]" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-tight" style={{ color: "hsl(var(--foreground))" }}>{label}</p>
        <p className="text-[11px] mt-0.5 leading-snug truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
          {summary}
        </p>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0"
        style={{ color: "hsl(var(--muted-foreground) / 0.25)" }}
      />
    </button>
  );
}
