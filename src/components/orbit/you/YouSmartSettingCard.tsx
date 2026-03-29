/**
 * YouSmartSettingCard — Summary card for a setting section.
 * Shows icon, label, summary text, and navigates to detail.
 */
import { ChevronRight, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

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
    <motion.button
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors text-left group"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}15` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{summary}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
    </motion.button>
  );
}
